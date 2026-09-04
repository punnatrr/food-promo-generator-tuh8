export const runtime = 'nodejs';
export const maxDuration = 300;

const OPENAI_IMAGE_ENDPOINT = 'https://api.openai.com/v1/images/edits';
const MAX_FOOD_REFERENCE_IMAGES = 10;
const MAX_TOTAL_IMAGE_BYTES = 3_800_000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;
const RATE_LIMIT_REQUESTS = 4;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
};

const rateLimitGlobal = globalThis as typeof globalThis & {
  __lazyFoodImageRateLimits?: Map<string, RateLimitEntry>;
};
const rateLimits =
  rateLimitGlobal.__lazyFoodImageRateLimits ?? new Map<string, RateLimitEntry>();
rateLimitGlobal.__lazyFoodImageRateLimits = rateLimits;

function json(data: object, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

function getClientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(request: Request) {
  const now = Date.now();
  const clientIp = getClientIp(request);
  const current = rateLimits.get(clientIp);

  if (!current || current.resetAt <= now) {
    rateLimits.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (current.count >= RATE_LIMIT_REQUESTS) return true;
  current.count += 1;

  if (rateLimits.size > 500) {
    for (const [ip, entry] of rateLimits) {
      if (entry.resetAt <= now) rateLimits.delete(ip);
    }
  }

  return false;
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function openAIErrorMessage(status: number, code?: string) {
  if (status === 401 || status === 403) {
    return 'ระบบ AI ยังเชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบ API key ใน Vercel';
  }
  if (status === 429) {
    return 'โควตาหรือจำนวนคำขอของ AI ถึงขีดจำกัด กรุณารอสักครู่หรือตรวจสอบเครดิต API';
  }
  if (code === 'moderation_blocked') {
    return 'AI ไม่สามารถสร้างภาพจากรูปหรือคำอธิบายนี้ได้ กรุณาเปลี่ยนรูปแล้วลองใหม่';
  }
  if (status >= 500) {
    return 'บริการสร้างภาพขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง';
  }
  return 'AI ไม่สามารถสร้างภาพจากข้อมูลนี้ได้ กรุณาตรวจสอบรูปและลองใหม่';
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return json({ error: 'ไม่อนุญาตให้เรียกใช้งานจากเว็บไซต์อื่น' }, 403);
  }

  if (isRateLimited(request)) {
    return json({ error: 'สร้างภาพถี่เกินไป กรุณารอประมาณ 10 นาทีแล้วลองใหม่' }, 429);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json({ error: 'ยังไม่ได้ตั้งค่า OPENAI_API_KEY บนเซิร์ฟเวอร์' }, 503);
  }

  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return json({ error: 'กรุณาส่งรูปอาหารและรายละเอียดสำหรับสร้างภาพ' }, 400);
    }
    const prompt = formData.get('prompt');
    const ratio = formData.get('ratio');
    const ratioValue = typeof ratio === 'string' ? ratio : '';
    const images = formData
      .getAll('image')
      .filter((value): value is File => value instanceof File);
    const logoValue = formData.get('logo');
    const logo = logoValue instanceof File && logoValue.size > 0 ? logoValue : null;

    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 12_000) {
      return json({ error: 'รายละเอียดสำหรับสร้างภาพไม่ถูกต้อง' }, 400);
    }
    if (!['square', 'portrait', 'story'].includes(ratioValue)) {
      return json({ error: 'อัตราส่วนภาพไม่ถูกต้อง' }, 400);
    }
    if (!images.length || images.length > MAX_FOOD_REFERENCE_IMAGES) {
      return json({ error: 'กรุณาแนบรูปอาหาร 1–10 รูป' }, 400);
    }
    if (
      images.some((image) => !SUPPORTED_IMAGE_TYPES.has(image.type)) ||
      (logo && !SUPPORTED_IMAGE_TYPES.has(logo.type))
    ) {
      return json({ error: 'รองรับเฉพาะไฟล์ JPG, PNG และ WEBP' }, 400);
    }

    const totalImageBytes =
      images.reduce((total, image) => total + image.size, 0) + (logo?.size ?? 0);
    if (totalImageBytes > MAX_TOTAL_IMAGE_BYTES) {
      return json({ error: 'รูปภาพรวมมีขนาดใหญ่เกินไป กรุณาเลือกรูปที่เล็กลง' }, 413);
    }

    const upstream = new FormData();
    images.forEach((image) => upstream.append('image[]', image, image.name));
    if (logo) upstream.append('image[]', logo, logo.name);
    upstream.append('model', 'gpt-image-2');
    upstream.append('prompt', prompt.trim());
    upstream.append('quality', 'high');
    const outputSizes = {
      square: '1024x1024',
      portrait: '1024x1280',
      story: '1152x2048',
    } as const;
    upstream.append('size', outputSizes[ratioValue as keyof typeof outputSizes]);
    upstream.append('output_format', 'jpeg');
    upstream.append('output_compression', '88');

    const response = await fetch(OPENAI_IMAGE_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: upstream,
      cache: 'no-store',
      signal: AbortSignal.timeout(240_000),
    });
    const payload = (await response.json().catch(() => ({}))) as OpenAIImageResponse;

    if (!response.ok) {
      return json(
        { error: openAIErrorMessage(response.status, payload.error?.code) },
        response.status >= 500 ? 502 : response.status,
      );
    }

    const imageBase64 = payload.data?.[0]?.b64_json;
    if (!imageBase64) {
      return json({ error: 'AI สร้างภาพแล้วแต่ไม่ได้ส่งไฟล์ภาพกลับมา กรุณาลองใหม่' }, 502);
    }

    return json({
      image: `data:image/jpeg;base64,${imageBase64}`,
      model: 'gpt-image-2',
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return json({ error: 'การสร้างภาพใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง' }, 504);
    }
    return json({ error: 'ระบบไม่สามารถประมวลผลรูปภาพได้ กรุณาลองใหม่อีกครั้ง' }, 500);
  }
}

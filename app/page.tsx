'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  Camera,
  Check,
  Copy,
  ImagePlus,
  Images,
  Languages,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  Share2,
  Sparkles,
  Store,
  UploadCloud,
  WandSparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

const MAX_FOOD_PHOTOS = 10;
const MAX_GENERATION_UPLOAD_BYTES = 3_300_000;
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const channels = ['Facebook', 'Instagram', 'LINE OA', 'TikTok'];
const tones = ['เป็นกันเอง', 'ทางการ', 'หรูหรา'];

const toneOpeners: Record<string, string> = {
  เป็นกันเอง: 'มื้อนี้ต้องลองแล้ว! 😋',
  ทางการ: 'สัมผัสความอร่อยที่เราตั้งใจรังสรรค์ในทุกจาน',
  หรูหรา: 'ประสบการณ์แห่งรสชาติที่ประณีตในทุกรายละเอียด ✨',
};

const toneDirections: Record<string, string> = {
  เป็นกันเอง: 'เป็นกันเอง เข้าถึงง่าย ชวนหิว และเหมาะกับ Social Media',
  ทางการ: 'สุภาพ น่าเชื่อถือ กระชับ และเป็นมืออาชีพ',
  หรูหรา: 'หรูหรา ประณีต พรีเมียม และมีรสนิยม',
};

type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options?: { signal: AbortSignal },
  ) => void | Promise<void>;
};

type PromoState = {
  restaurant: string;
  menu: string;
  price: string;
  tagline: string;
  channel: string;
  tone: string;
};

type UploadedImage = {
  id: string;
  name: string;
  url: string;
  file: File;
};

const initialPromo: PromoState = {
  restaurant: 'ครัวใจดี',
  menu: 'ข้าวกะเพราไข่ดาว',
  price: '79',
  tagline: 'หอมกะเพราสด ผัดจานต่อจาน เผ็ดร้อนถึงใจ',
  channel: 'Instagram',
  tone: 'เป็นกันเอง',
};

function displayPrice(price: string) {
  const trimmed = price.trim();
  if (!trimmed) return '— บาท';
  return trimmed.includes('บาท') ? trimmed : `${trimmed} บาท`;
}

function buildImagePrompt(
  data: PromoState,
  photoCount: number,
  hasLogo: boolean,
) {
  return `สร้างภาพโฆษณาอาหารระดับ Professional Commercial Food Photography สำหรับโพสต์ ${data.channel} โดยใช้อาหารจากรูปอ้างอิง ${photoCount} รูปเป็น HERO หลักของภาพ ดูน่ากินมาก สดใหม่ ฉ่ำ มี texture ชัดเจน และให้ความรู้สึกเหมือนภาพโฆษณาร้านอาหารระดับมืออาชีพ

ข้อมูลที่ต้องแสดงในภาพเท่านั้น:
ชื่อเมนู: “${data.menu}”
คำโปรย: “${data.tagline}”
ราคา: “${displayPrice(data.price)}”
${hasLogo ? `รูปอ้างอิงรูปสุดท้ายคือโลโก้ร้าน “${data.restaurant}” ให้นำโลโก้นั้นมาใช้ในชิ้นงานโดยรักษารูปทรง สี และสัดส่วนเดิม` : 'ห้ามสร้างหรือใส่โลโก้และชื่อร้านเพิ่มเติม'}

VISUAL DIRECTION:
นำเสนอ “${data.menu}” เป็นจุดเด่นที่สุดของภาพ จัดวางอาหารขนาดใหญ่ เห็นรายละเอียดวัตถุดิบชัดเจน เน้นความสด ความฉ่ำ ความกรอบ ความนุ่ม หรือความเข้มข้นตามธรรมชาติของเมนู ถ้าเป็นอาหารร้อนให้เห็นไอร้อนบาง ๆ ที่สมจริง ถ้ามีซอสให้ฉ่ำ เงาสวย และเคลือบอาหารอย่างเป็นธรรมชาติ ถ้าเป็นอาหารทอดให้เห็นผิวกรอบสีเหลืองทอง ถ้าเป็นเนื้อให้ดู juicy ชุ่มฉ่ำ ถ้าเป็นชีสให้ดูเยิ้ม ถ้าเป็นเครื่องดื่มให้เห็นหยดน้ำเย็นเกาะแก้ว ห้ามทำให้อาหารดูเป็นพลาสติกหรือ CGI

COMPOSITION & LIGHTING:
Premium Food Advertising ให้อาหารกินพื้นที่ประมาณ 55–70% ของภาพ ใช้มุมกล้องที่เหมาะกับชนิดอาหาร เช่น 45-degree hero angle, close-up หรือ slightly top-down มี foreground และ background separation, shallow depth of field เล็กน้อย ฉากหลังสะอาด ไม่รก เข้ากับประเภทอาหาร และมีวัตถุดิบประกอบฉากได้เล็กน้อยโดยไม่แย่งความเด่น ใช้ professional restaurant advertising lighting แสงนุ่มจากด้านข้างและด้านหลัง มี highlight เน้นความฉ่ำและ texture เงามีมิติ สีสดสมจริง high dynamic range, photorealistic, high-end retouching, ultra detailed

TYPOGRAPHY & GRAPHIC DESIGN:
ออกแบบข้อความให้เป็นส่วนหนึ่งของงานโฆษณา ไม่ใช่เพียงนำข้อความมาวางทับภาพ ชื่อเมนู “${data.menu}” ต้องใหญ่ เด่น และอ่านง่ายที่สุดรองจากอาหาร คำโปรย “${data.tagline}” มีขนาดรองลงมา อ่านง่าย และช่วยกระตุ้นความอยากอาหาร ราคา “${displayPrice(data.price)}” ต้องโดดเด่นและมองเห็นทันทีด้วย price badge, sticker, label หรือ graphic element ที่เข้ากับงาน ใช้ระดับภาษา “${data.tone}” (${toneDirections[data.tone]})

จัดลำดับ Visual Hierarchy: 1) อาหาร 2) ชื่อเมนู 3) ราคา 4) คำโปรย ไม่วางข้อความทับบริเวณสำคัญของอาหาร และเว้นพื้นที่หายใจรอบข้อความอย่างเหมาะสม คัดลอกข้อความภาษาไทยทั้งสามรายการตามที่ให้ไว้แบบตัวต่อตัว ห้ามแปล ห้ามเรียบเรียงใหม่ ห้ามเพิ่มหรือตัดคำ และต้องสะกดถูกต้อง อ่านง่าย ไม่ผิดเพี้ยน

STYLE:
Modern premium restaurant advertisement, appetizing, mouth-watering, clean commercial layout, professional food styling, realistic photography, high-end restaurant campaign, พร้อมโพสต์ขายสินค้า ไม่รก ไม่มี watermark ไม่มีข้อความอื่นนอกเหนือจากที่กำหนด และไม่มีองค์ประกอบที่ไม่เกี่ยวข้อง

ข้อกำหนดสำคัญ: ส่งออกเป็นโปสเตอร์โฆษณาที่เสร็จสมบูรณ์ในไฟล์ภาพเดียว โดยมีภาพอาหาร งานกราฟิก ข้อความที่กำหนด และ${hasLogo ? 'โลโก้จากรูปอ้างอิง' : 'ไม่มีโลโก้'}รวมอยู่ในภาพที่สร้างแล้ว`;
}

async function compressReferenceImage(
  file: File,
  targetBytes: number,
  role: 'food' | 'logo' = 'food',
) {
  const bitmap = await createImageBitmap(file);
  let maxEdge = role === 'logo' ? 1_024 : 1_600;
  let quality = role === 'logo' ? 0.92 : 0.86;
  let latestBlob: Blob | null = null;
  const outputType = role === 'logo' ? 'image/webp' : 'image/jpeg';

  try {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('ไม่สามารถเตรียมรูปภาพนี้ได้');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      latestBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('ไม่สามารถบีบอัดรูปภาพนี้ได้'))),
          outputType,
          quality,
        );
      });

      if (latestBlob.size <= targetBytes) break;
      maxEdge = Math.max(720, Math.round(maxEdge * 0.82));
      quality = Math.max(0.56, quality - 0.08);
    }
  } finally {
    bitmap.close();
  }

  if (!latestBlob || latestBlob.size > targetBytes) {
    throw new Error(`รูป ${file.name} มีขนาดใหญ่เกินไป กรุณาเลือกรูปที่เล็กลง`);
  }

  const safeName = file.name.replace(/\.[^.]+$/, '') || role;
  const extension = role === 'logo' ? 'webp' : 'jpg';
  return new File([latestBlob], `${safeName}.${extension}`, {
    type: outputType,
    lastModified: file.lastModified,
  });
}

export default function Home() {
  const [promo, setPromo] = useState(initialPromo);
  const [result, setResult] = useState(initialPromo);
  const [foodPhotos, setFoodPhotos] = useState<UploadedImage[]>([]);
  const [logo, setLogo] = useState<UploadedImage | null>(null);
  const [activeFoodId, setActiveFoodId] = useState<string | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [resultRatio, setResultRatio] = useState<'square' | 'portrait' | 'story'>('portrait');
  const [ratio, setRatio] = useState<'square' | 'portrait' | 'story'>('portrait');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploadNotice, setUploadNotice] = useState('');
  const objectUrls = useRef<string[]>([]);

  const caption = useMemo(
    () =>
      `${toneOpeners[result.tone] ?? toneOpeners['เป็นกันเอง']}\n\n“${result.menu}” — ${result.tagline}\n${displayPrice(result.price)}\n\nแวะมาที่ ${result.restaurant} หรือทักแชตสั่งได้เลยวันนี้!\n\n#${result.restaurant.replace(/\s/g, '')} #โปรร้านอาหาร #ของอร่อยบอกต่อ`,
    [result],
  );

  useEffect(() => {
    return () => objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    void Promise.resolve(
      context.registerTool(
        {
          name: 'prepare_restaurant_advertisement',
          title: 'เตรียมภาพโฆษณาร้านอาหาร',
          description:
            'กรอกข้อมูลร้าน เมนู คำโปรย ราคา ช่องทาง และระดับภาษา เพื่อเตรียมภาพโฆษณาอาหารระดับมืออาชีพ',
          inputSchema: {
            type: 'object',
            properties: {
              restaurant: { type: 'string', minLength: 1, description: 'ชื่อร้านอาหาร' },
              menu: { type: 'string', minLength: 1, description: 'ชื่อเมนู' },
              tagline: { type: 'string', minLength: 1, description: 'คำโปรยเมนู' },
              price: { type: 'string', minLength: 1, description: 'ราคา ไม่จำเป็นต้องใส่คำว่าบาท' },
              channel: { type: 'string', enum: channels },
              tone: { type: 'string', enum: tones },
            },
            required: ['restaurant', 'menu', 'tagline', 'price', 'channel', 'tone'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            if (!input || typeof input !== 'object')
              throw new Error('ข้อมูลโปรโมชันไม่ถูกต้อง');
            const data = input as Partial<PromoState>;
            for (const key of ['restaurant', 'menu', 'tagline', 'price'] as const) {
              if (typeof data[key] !== 'string' || !data[key]?.trim())
                throw new Error(`กรุณาระบุ ${key}`);
            }
            const next = { ...initialPromo, ...data } as PromoState;
            if (!channels.includes(next.channel) || !tones.includes(next.tone))
              throw new Error('ช่องทางหรือระดับภาษาไม่ถูกต้อง');
            setPromo(next);
            setResult(next);
            const prompt = buildImagePrompt(next, foodPhotos.length, Boolean(logo));
            return {
              status: foodPhotos.length ? 'ready' : 'waiting_for_food_photos',
              restaurant: next.restaurant,
              menu: next.menu,
              channel: next.channel,
              prompt,
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);

    return () => lifecycle.abort();
  }, [foodPhotos.length, logo]);

  function update<K extends keyof PromoState>(key: K, value: PromoState[K]) {
    setPromo((current) => ({ ...current, [key]: value }));
    setFormError('');
  }

  function rememberUrl(url: string) {
    objectUrls.current.push(url);
    return url;
  }

  function forgetUrl(url: string) {
    URL.revokeObjectURL(url);
    objectUrls.current = objectUrls.current.filter((item) => item !== url);
  }

  function addFoodPhotos(files: FileList | null) {
    if (!files?.length) return;
    const imageFiles = Array.from(files).filter((file) => SUPPORTED_IMAGE_TYPES.includes(file.type));
    const remaining = MAX_FOOD_PHOTOS - foodPhotos.length;
    const accepted = imageFiles.slice(0, Math.max(remaining, 0));
    const nextPhotos = accepted.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      url: rememberUrl(URL.createObjectURL(file)),
      file,
    }));

    if (nextPhotos.length) {
      setFoodPhotos((current) => [...current, ...nextPhotos]);
      setActiveFoodId((current) => current ?? nextPhotos[0].id);
      setFormError('');
    }

    if (imageFiles.length > accepted.length) {
      setUploadNotice(`เพิ่มได้สูงสุด ${MAX_FOOD_PHOTOS} รูป ระบบรับไว้ ${accepted.length} รูป`);
    } else if (imageFiles.length !== files.length) {
      setUploadNotice('รองรับเฉพาะไฟล์ JPG, PNG และ WEBP เท่านั้น');
    } else {
      setUploadNotice('');
    }
  }

  function removeFoodPhoto(photo: UploadedImage) {
    const remaining = foodPhotos.filter((item) => item.id !== photo.id);
    setFoodPhotos(remaining);
    if (activeFoodId === photo.id) setActiveFoodId(remaining[0]?.id ?? null);
    forgetUrl(photo.url);
    setUploadNotice('');
  }

  function setLogoFile(file: File | undefined) {
    if (!file) return;
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      setUploadNotice('โลโก้ต้องเป็นไฟล์ JPG, PNG หรือ WEBP');
      return;
    }
    if (logo) {
      forgetUrl(logo.url);
    }
    const nextLogo = {
      id: crypto.randomUUID(),
      name: file.name,
      url: rememberUrl(URL.createObjectURL(file)),
      file,
    };
    setLogo(nextLogo);
    setUploadNotice('');
  }

  function removeLogo() {
    if (!logo) return;
    forgetUrl(logo.url);
    setLogo(null);
  }

  function resetWorkflow() {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current = [];
    setPromo(initialPromo);
    setResult(initialPromo);
    setFoodPhotos([]);
    setLogo(null);
    setActiveFoodId(null);
    setResultImageUrl(null);
    setResultRatio('portrait');
    setFormError('');
    setUploadNotice('');
  }

  async function generatePromo() {
    if (!foodPhotos.length) {
      setFormError('กรุณาอัปโหลดรูปอาหารอย่างน้อย 1 รูปก่อนสร้างภาพ');
      document.getElementById('food-upload')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!promo.restaurant.trim() || !promo.menu.trim() || !promo.tagline.trim() || !promo.price.trim()) {
      setFormError('กรุณากรอกชื่อร้าน ชื่อเมนู คำโปรย และราคาให้ครบ');
      return;
    }

    const prompt = buildImagePrompt(promo, foodPhotos.length, Boolean(logo));
    setLoading(true);
    setFormError('');

    try {
      const orderedPhotos = [...foodPhotos].sort((left, right) => {
        if (left.id === activeFoodId) return -1;
        if (right.id === activeFoodId) return 1;
        return 0;
      });
      const referenceCount = foodPhotos.length + (logo ? 1 : 0);
      const targetBytes = Math.floor(MAX_GENERATION_UPLOAD_BYTES / referenceCount);
      const preparedPhotos = await Promise.all(
        orderedPhotos.map((photo) => compressReferenceImage(photo.file, targetBytes)),
      );
      const preparedLogo = logo
        ? await compressReferenceImage(logo.file, targetBytes, 'logo')
        : null;
      const requestBody = new FormData();
      preparedPhotos.forEach((photo) => requestBody.append('image', photo, photo.name));
      if (preparedLogo) requestBody.append('logo', preparedLogo, preparedLogo.name);
      requestBody.append('prompt', prompt);
      requestBody.append('ratio', ratio);

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 180_000);
      let response: Response;
      try {
        response = await fetch('/api/generate-image', {
          method: 'POST',
          body: requestBody,
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'สร้างภาพไม่สำเร็จ กรุณาลองอีกครั้ง');
      }

      const generatedImage = await response.blob();
      if (!generatedImage.size || !generatedImage.type.startsWith('image/')) {
        throw new Error('ระบบไม่ได้รับไฟล์ภาพจาก AI กรุณาลองอีกครั้ง');
      }

      if (resultImageUrl?.startsWith('blob:')) forgetUrl(resultImageUrl);
      const generatedImageUrl = rememberUrl(URL.createObjectURL(generatedImage));
      setResult({ ...promo });
      setResultImageUrl(generatedImageUrl);
      setResultRatio(ratio);
      document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? 'AI ใช้เวลานานเกิน 3 นาที ระบบหยุดการรอแล้ว กรุณาลองใหม่อีกครั้ง'
          : error instanceof Error
            ? error.message
            : 'สร้างภาพไม่สำเร็จ กรุณาลองอีกครั้ง';
      setFormError(message);
      document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } finally {
      setLoading(false);
    }
  }

  async function copyCaption() {
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const workflowSteps = [
    'รูปอาหาร',
    'โลโก้ร้าน',
    'ข้อมูลเมนู',
    'คำโปรย',
    'ช่องทาง',
    'ระดับภาษา',
    'สร้างภาพ',
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="site-header">
        <div className="site-header-inner">
          <a href="#workspace" className="brand-lockup" aria-label="LAZYFOOD.AI เริ่มสร้างภาพ">
            <span className="brand-icon"><Sparkles className="size-5" /></span>
            <span className="brand-copy">
              <strong>LAZYFOOD<span>.AI</span></strong>
              <small>AI Food Creative Studio</small>
            </span>
          </a>
          <nav className="header-nav" aria-label="เมนูหลัก">
            <a href="#workspace">สร้างภาพ</a>
            <a href="#result">ตัวอย่างผลงาน</a>
            <span className="beta-pill">เวอร์ชันทดลอง</span>
          </nav>
        </div>
      </header>

      <section className="site-shell">
        <div className="hero-block">
          <div className="hero-kicker"><span /> AI FOOD ADVERTISING STUDIO</div>
          <h1>เปลี่ยนรูปอาหารของคุณ<span>เป็นภาพโฆษณาระดับมืออาชีพ</span></h1>
          <p>อัปโหลดภาพ กรอกข้อมูล แล้วสร้างชิ้นงานพร้อมโพสต์ตามช่องทางและระดับภาษาที่คุณเลือก</p>
          <div className="hero-stats" aria-label="จุดเด่นของเครื่องมือ">
            <span>อัปโหลดได้สูงสุด 10 รูป</span>
            <span>รองรับโลโก้ร้าน</span>
            <span>3 ขนาด Social Media</span>
          </div>
        </div>

        <ol className="workflow-strip" aria-label="ลำดับการสร้างภาพ">
          {workflowSteps.map((step, index) => (
            <li key={step}><span>{index + 1}</span>{step}</li>
          ))}
        </ol>

        <div id="workspace" className="workspace-grid">
          <form
            className="panel form-panel"
            onSubmit={(event) => {
              event.preventDefault();
              void generatePromo();
            }}
          >
            <div className="panel-heading">
              <div className="heading-copy">
                <span className="step-number">01–07</span>
                <div>
                  <h2>เวิร์กโฟลว์สร้างภาพ</h2>
                  <p>ทำตามลำดับให้ครบ แล้วกดสร้างภาพในขั้นตอนสุดท้าย</p>
                </div>
              </div>
              <button type="button" className="reset-button" onClick={resetWorkflow}>
                <RotateCcw className="size-3.5" /> รีเซ็ต
              </button>
            </div>

            <div className="form-body">
              <WorkflowStep
                step="01"
                title="อัปโหลดรูปอาหาร"
                description={`เพิ่มได้หลายรูป แต่ไม่เกิน ${MAX_FOOD_PHOTOS} รูป และเลือกรูปหลักสำหรับชิ้นงานได้`}
                icon={<Images className="size-4" />}
              >
                <div id="food-upload" className="upload-area">
                  <input
                    id="food-photos"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      addFoodPhotos(event.currentTarget.files);
                      event.currentTarget.value = '';
                    }}
                  />
                  <label className="upload-dropzone" htmlFor="food-photos">
                    <span className="upload-icon"><UploadCloud className="size-5" /></span>
                    <span><strong>เลือกรูปอาหาร</strong><small>JPG, PNG หรือ WEBP · {foodPhotos.length}/{MAX_FOOD_PHOTOS} รูป</small></span>
                  </label>
                </div>

                {foodPhotos.length > 0 && (
                  <div className="photo-grid" aria-label="รูปอาหารที่อัปโหลด">
                    {foodPhotos.map((photo, index) => (
                      <div key={photo.id} className={`photo-item ${activeFoodId === photo.id ? 'active' : ''}`}>
                        <button
                          type="button"
                          className="photo-select"
                          onClick={() => setActiveFoodId(photo.id)}
                          aria-label={`เลือกรูป ${photo.name} เป็นรูปหลัก`}
                        >
                          <Image src={photo.url} alt={photo.name} fill sizes="96px" unoptimized />
                          <span>{activeFoodId === photo.id ? 'รูปหลัก' : `รูป ${index + 1}`}</span>
                        </button>
                        <button
                          type="button"
                          className="photo-remove"
                          onClick={() => removeFoodPhoto(photo)}
                          aria-label={`ลบรูป ${photo.name}`}
                        ><X className="size-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </WorkflowStep>

              <WorkflowStep
                step="02"
                title="อัปโหลดโลโก้ร้าน"
                description="ไม่บังคับ · หากอัปโหลด โลโก้จะถูกวางอย่างพอดีและไม่บังอาหาร"
                icon={<ImagePlus className="size-4" />}
              >
                {logo ? (
                  <div className="logo-preview">
                    <span className="logo-image"><Image src={logo.url} alt={`โลโก้ ${promo.restaurant}`} fill sizes="64px" unoptimized /></span>
                    <span><strong>{logo.name}</strong><small>พร้อมใช้บนชิ้นงาน</small></span>
                    <button type="button" onClick={removeLogo} aria-label="ลบโลโก้"><X className="size-4" /></button>
                  </div>
                ) : (
                  <>
                    <input
                      id="shop-logo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => {
                        setLogoFile(event.currentTarget.files?.[0]);
                        event.currentTarget.value = '';
                      }}
                    />
                    <label className="logo-upload" htmlFor="shop-logo"><ImagePlus className="size-4" /> เพิ่มโลโก้ร้าน <span>ไม่บังคับ</span></label>
                  </>
                )}
              </WorkflowStep>

              <WorkflowStep
                step="03"
                title="กรอกข้อมูลร้านและเมนู"
                description="ข้อมูลหลักที่ใช้บนชิ้นงานโฆษณา"
                icon={<Store className="size-4" />}
              >
                <div className="fields-stack">
                  <Field label="ชื่อร้าน">
                    <Input required value={promo.restaurant} onChange={(event) => update('restaurant', event.target.value)} />
                  </Field>
                  <Field label="ชื่อเมนู">
                    <Input required value={promo.menu} onChange={(event) => update('menu', event.target.value)} />
                  </Field>
                  <Field label="ราคา">
                    <div className="price-input-wrap">
                      <Input required inputMode="decimal" value={promo.price} onChange={(event) => update('price', event.target.value)} />
                      <span>บาท</span>
                    </div>
                  </Field>
                </div>
              </WorkflowStep>

              <WorkflowStep
                step="04"
                title="ใส่คำอธิบายเมนู (คำโปรย)"
                description="เขียนสั้น กระชับ และบอกจุดเด่นที่ทำให้เมนูน่ากิน"
                icon={<MessageSquareText className="size-4" />}
              >
                <Field label="คำโปรย">
                  <Textarea required rows={3} maxLength={140} value={promo.tagline} onChange={(event) => update('tagline', event.target.value)} />
                  <span className="character-count">{promo.tagline.length}/140</span>
                </Field>
              </WorkflowStep>

              <WorkflowStep
                step="05"
                title="เลือกช่องทางโพสต์"
                description="สัดส่วนภาพยังสามารถปรับได้ในพื้นที่ผลงาน"
                icon={<Share2 className="size-4" />}
              >
                <Field label="ช่องทางที่จะโพสต์">
                  <div className="grid grid-cols-2 gap-2">
                    {channels.map((channel) => (
                      <button
                        key={channel}
                        type="button"
                        className={`choice-button ${promo.channel === channel ? 'active' : ''}`}
                        onClick={() => {
                          update('channel', channel);
                          setRatio(channel === 'TikTok' ? 'story' : channel === 'Instagram' ? 'portrait' : 'square');
                        }}
                      >
                        {promo.channel === channel && <Check className="size-3.5" />}{channel}
                      </button>
                    ))}
                  </div>
                </Field>
              </WorkflowStep>

              <WorkflowStep
                step="06"
                title="เลือกระดับภาษา"
                description="AI จะปรับน้ำเสียงของคำโฆษณาให้เหมาะกับแบรนด์"
                icon={<Languages className="size-4" />}
              >
                <Field label="ระดับภาษา">
                  <NativeSelect value={promo.tone} onChange={(event) => update('tone', event.target.value)} className="w-full">
                    {tones.map((tone) => <option key={tone}>{tone}</option>)}
                  </NativeSelect>
                </Field>
              </WorkflowStep>

              {uploadNotice && <output className="form-notice">{uploadNotice}</output>}
              {formError && <p className="form-error" role="alert">{formError}</p>}

              <div className="final-step">
                <span className="final-step-number">07</span>
                <div><strong>สร้างภาพโฆษณา</strong><small>AI จะเจนโปสเตอร์พร้อมภาพอาหาร ข้อความ ราคา และโลโก้ในไฟล์เดียว</small></div>
              </div>
              <Button type="submit" size="lg" className="generate-button h-14 w-full rounded-xl text-base font-extrabold" disabled={loading}>
                {loading ? <LoaderCircle className="size-5 animate-spin" /> : <WandSparkles className="size-5" />}
                {loading ? 'AI กำลังออกแบบภาพ...' : 'สร้างภาพด้วย AI'}
              </Button>
            </div>
          </form>

          <div className="results-column">
            <section id="result" className="panel result-panel overflow-hidden" aria-label="ผลลัพธ์ภาพที่ AI สร้าง">
              <div className="panel-heading">
                <div className="heading-copy">
                  <span className="step-number result-step">07</span>
                  <div><h2>ผลงานพร้อมโพสต์</h2><p>ไฟล์โปสเตอร์ที่ AI สร้างจากรูปและข้อมูลของคุณ</p></div>
                </div>
                <fieldset className="ratio-toggle" aria-label="อัตราส่วนรูปภาพ">
                  <button type="button" className={ratio === 'square' ? 'active' : ''} onClick={() => setRatio('square')}>1:1</button>
                  <button type="button" className={ratio === 'portrait' ? 'active' : ''} onClick={() => setRatio('portrait')}>4:5</button>
                  <button type="button" className={ratio === 'story' ? 'active' : ''} onClick={() => setRatio('story')}>9:16</button>
                </fieldset>
              </div>

              <div className="preview-stage">
                <div className={`promo-card ratio-${resultImageUrl ? resultRatio : ratio} ${loading ? 'is-loading' : ''}`}>
                  {resultImageUrl ? (
                    <Image
                      src={resultImageUrl}
                      alt={`โปสเตอร์ ${result.menu} ที่ AI สร้าง`}
                      fill
                      priority
                      sizes="(max-width: 1023px) 90vw, 48vw"
                      unoptimized
                    />
                  ) : (
                    <div className="result-empty-state">
                      <span><WandSparkles className="size-7" /></span>
                      <strong>{formError || 'ยังไม่มีภาพที่เจน'}</strong>
                      <small>{formError ? 'ตรวจสอบข้อความแจ้งเตือนแล้วลองใหม่' : 'อัปโหลดรูปอาหาร แล้วกด “สร้างภาพด้วย AI”'}</small>
                    </div>
                  )}
                  {loading && <div className="loading-overlay"><LoaderCircle className="size-8 animate-spin text-primary" /><span>AI กำลังจัดแสงและองค์ประกอบ...</span><small>ระบบจะหยุดรออัตโนมัติภายใน 3 นาที</small></div>}
                </div>
              </div>

              <div className="quality-bar">
                <span><BadgeCheck className="size-4" /> Professional Food Ad</span>
                <span>{resultImageUrl ? 'ภาพนี้สร้างโดย AI จากข้อมูลล่าสุด' : 'รอสร้างภาพจริงจาก AI'}</span>
              </div>
            </section>

            <aside id="caption" className="panel caption-panel">
              <div className="panel-heading compact">
                <div className="flex items-center gap-2"><Camera className="size-4 text-primary" /><h2>แคปชันสำหรับ {result.channel}</h2></div>
                <Button variant="ghost" size="sm" onClick={copyCaption} className="text-[#c5c3ba] hover:bg-white/10 hover:text-white">
                  {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                  {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                </Button>
              </div>
              <div className="p-5 sm:p-6"><p className="whitespace-pre-line text-[15px] leading-7 text-[#d3d1c9]">{caption}</p></div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function WorkflowStep({
  step,
  title,
  description,
  icon,
  children,
}: {
  step: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="form-section workflow-section">
      <div className="section-heading">
        <div className="section-title-wrap"><span className="section-icon">{icon}</span><div><h3>{title}</h3><p>{description}</p></div></div>
        <span>STEP {step}</span>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field-label">
      <span>{label}</span>
      {children}
    </label>
  );
}

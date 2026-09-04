'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Check,
  Camera,
  Copy,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';

const channels = ['Facebook', 'Instagram', 'LINE OA', 'TikTok'];
const tones = ['สนุก เป็นกันเอง', 'น่ากินจนต้องสั่ง', 'พรีเมียม', 'เร่งด่วน FOMO'];

const toneOpeners: Record<string, string> = {
  'สนุก เป็นกันเอง': 'วันนี้กินอะไรดี? ให้จานนี้ตอบแทน 😋',
  น่ากินจนต้องสั่ง: 'หิวเมื่อไหร่ ให้จานเด็ดช่วย 🔥',
  พรีเมียม: 'ความอร่อยที่ตั้งใจ ตั้งแต่วัตถุดิบถึงจานเสิร์ฟ ✨',
  'เร่งด่วน FOMO': 'โปรนี้มีไม่นาน! ช้าอดอร่อยนะ ⏰',
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
  offer: string;
  price: string;
  details: string;
  channel: string;
  tone: string;
};

const initialPromo: PromoState = {
  restaurant: 'ครัวใจดี',
  menu: 'ข้าวกะเพราไข่ดาว',
  offer: 'อิ่มคุ้ม ลดทันที 20%',
  price: 'เริ่มต้น 79 บาท',
  details: 'หอมกะเพราสด ผัดจานต่อจาน เผ็ดร้อนถึงใจ โปรเฉพาะสัปดาห์นี้',
  channel: 'Instagram',
  tone: 'น่ากินจนต้องสั่ง',
};

export default function Home() {
  const [promo, setPromo] = useState(initialPromo);
  const [result, setResult] = useState(initialPromo);
  const [ratio, setRatio] = useState<'square' | 'portrait' | 'story'>('square');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const caption = useMemo(
    () =>
      `${toneOpeners[result.tone] ?? toneOpeners['น่ากินจนต้องสั่ง']}\n\n${result.offer} กับ “${result.menu}” ${result.details} — ${result.price}\n\nแวะมาที่ ${result.restaurant} หรือทักแชตสั่งได้เลยวันนี้!\n\n#${result.restaurant.replace(/\s/g, '')} #โปรร้านอาหาร #ของอร่อยบอกต่อ`,
    [result],
  );

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    void Promise.resolve(
      context.registerTool(
        {
          name: 'generate_restaurant_promotion',
          title: 'สร้างโปรโมชันร้านอาหาร',
          description: 'กรอกรายละเอียดและสร้างโปสเตอร์พร้อมแคปชันในหน้า LAZYFOOD.AI',
          inputSchema: {
            type: 'object',
            properties: {
              restaurant: {
                type: 'string',
                minLength: 1,
                description: 'ชื่อร้านอาหาร',
              },
              menu: { type: 'string', minLength: 1, description: 'ชื่อเมนู' },
              offer: {
                type: 'string',
                minLength: 1,
                description: 'ข้อความโปรโมชัน',
              },
              price: { type: 'string', minLength: 1, description: 'ราคา' },
              details: { type: 'string', description: 'จุดเด่นของเมนู' },
              channel: { type: 'string', enum: channels },
              tone: { type: 'string', enum: tones },
            },
            required: ['restaurant', 'menu', 'offer', 'price'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            if (!input || typeof input !== 'object')
              throw new Error('ข้อมูลโปรโมชันไม่ถูกต้อง');
            const data = input as Partial<PromoState>;
            for (const key of [
              'restaurant',
              'menu',
              'offer',
              'price',
            ] as const) {
              if (typeof data[key] !== 'string' || !data[key]?.trim())
                throw new Error(`กรุณาระบุ ${key}`);
            }
            const next = { ...initialPromo, ...data } as PromoState;
            if (!channels.includes(next.channel) || !tones.includes(next.tone))
              throw new Error('ช่องทางหรือน้ำเสียงไม่ถูกต้อง');
            setPromo(next);
            setResult(next);
            return {
              status: 'ready',
              restaurant: next.restaurant,
              menu: next.menu,
              channel: next.channel,
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);

    return () => lifecycle.abort();
  }, []);

  function update<K extends keyof PromoState>(key: K, value: PromoState[K]) {
    setPromo((current) => ({ ...current, [key]: value }));
  }

  function generatePromo() {
    setLoading(true);
    window.setTimeout(() => {
      setResult(promo);
      setLoading(false);
    }, 850);
  }

  async function copyCaption() {
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="site-header">
        <div className="site-header-inner">
          <a
            href="#"
            className="brand-lockup"
            aria-label="LAZYFOOD.AI หน้าหลัก"
          >
            <span className="brand-icon">
              <Sparkles className="size-5" />
            </span>
            <span className="brand-copy">
              <strong>
                LAZYFOOD<span>.AI</span>
              </strong>
              <small>AI Food Creative Studio</small>
            </span>
          </a>

          <nav className="header-nav" aria-label="เมนูหลัก">
            <a href="#workspace">สร้างโปรโมชัน</a>
            <a href="#result">ตัวอย่างผลงาน</a>
            <span className="beta-pill">เวอร์ชันทดลอง</span>
          </nav>
        </div>
      </header>

      <section className="site-shell">
        <div className="hero-block">
          <div className="hero-kicker">
            <span /> AI FOOD PROMOTION STUDIO
          </div>
          <h1>
            สร้างรูปโปรโมตร้านอาหารง่ายๆ
            <span>พร้อมโพสต์ในไม่กี่คลิก</span>
          </h1>
          <p>
            ใส่ชื่อร้าน เมนู ราคา และโปรโมชัน แล้วให้ AI ช่วยจัดภาพพร้อมแคปชัน
            สำหรับช่องทางที่คุณเลือก
          </p>
          <div className="hero-stats" aria-label="จุดเด่นของเครื่องมือ">
            <span>4 ช่องทางยอดนิยม</span>
            <span>3 ขนาดพร้อมใช้</span>
            <span>แคปชันพร้อมโพสต์</span>
          </div>
        </div>

        <div id="workspace" className="workspace-grid">
          <form
            className="panel form-panel"
            onSubmit={(event) => {
              event.preventDefault();
              generatePromo();
            }}
          >
            <div className="panel-heading">
              <div className="heading-copy">
                <span className="step-number">01</span>
                <div>
                  <h2>ตั้งค่าโปรโมชัน</h2>
                  <p>กรอกรายละเอียดร้านและกำหนดรูปแบบโพสต์ที่ต้องการ</p>
                </div>
              </div>
              <button
                type="button"
                className="reset-button"
                onClick={() => setPromo(initialPromo)}
              >
                <RotateCcw className="size-3.5" /> รีเซ็ต
              </button>
            </div>

            <div className="form-body">
              <section className="form-section">
                <div className="section-heading">
                  <div>
                    <h3>ข้อมูลร้านและเมนู</h3>
                    <p>ระบุเมนูหลักและข้อเสนอที่ลูกค้าจะเห็นบนภาพ</p>
                  </div>
                  <span>STEP 1</span>
                </div>

                <div className="fields-stack">
                  <Field label="ชื่อร้าน">
                    <Input
                      value={promo.restaurant}
                      onChange={(e) => update('restaurant', e.target.value)}
                    />
                  </Field>

                  <Field label="เมนูที่อยากโปรโมต">
                    <Input
                      value={promo.menu}
                      onChange={(e) => update('menu', e.target.value)}
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="ข้อเสนอ / โปรโมชัน">
                      <Input
                        value={promo.offer}
                        onChange={(e) => update('offer', e.target.value)}
                      />
                    </Field>
                    <Field label="ราคา">
                      <Input
                        value={promo.price}
                        onChange={(e) => update('price', e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              </section>

              <section className="form-section">
                <div className="section-heading">
                  <div>
                    <h3>รายละเอียดและรูปแบบ</h3>
                    <p>เลือกจุดขาย ช่องทาง และน้ำเสียงให้เหมาะกับโพสต์</p>
                  </div>
                  <span>STEP 2</span>
                </div>

                <div className="fields-stack">
                  <Field label="จุดเด่นของเมนู">
                    <Textarea
                      rows={3}
                      value={promo.details}
                      onChange={(e) => update('details', e.target.value)}
                    />
                  </Field>

                  <Field label="ช่องทางที่จะโพสต์">
                    <div className="grid grid-cols-2 gap-2">
                      {channels.map((channel) => (
                        <button
                          key={channel}
                          type="button"
                          className={`choice-button ${promo.channel === channel ? 'active' : ''}`}
                          onClick={() => update('channel', channel)}
                        >
                          {promo.channel === channel && (
                            <Check className="size-3.5" />
                          )}
                          {channel}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="น้ำเสียง">
                    <NativeSelect
                      value={promo.tone}
                      onChange={(e) => update('tone', e.target.value)}
                      className="w-full"
                    >
                      {tones.map((tone) => (
                        <option key={tone}>{tone}</option>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
              </section>

              <Button
                type="submit"
                size="lg"
                className="generate-button h-14 w-full rounded-xl text-base font-extrabold"
                disabled={loading}
              >
                {loading ? (
                  <LoaderCircle className="size-5 animate-spin" />
                ) : (
                  <WandSparkles className="size-5" />
                )}
                {loading ? 'กำลังปรุงไอเดีย...' : 'สร้างโปรโมชั่นด้วย AI'}
              </Button>
            </div>
          </form>

          <div className="results-column">
            <section
              id="result"
              className="panel result-panel overflow-hidden"
              aria-label="ตัวอย่างผลงาน"
            >
              <div className="panel-heading">
                <div className="heading-copy">
                  <span className="step-number result-step">02</span>
                  <div>
                    <h2>พื้นที่สร้างสรรค์</h2>
                    <p>ดูตัวอย่างและสลับขนาดผลงานก่อนนำไปโพสต์</p>
                  </div>
                </div>
                <div
                  className="ratio-toggle"
                  role="group"
                  aria-label="อัตราส่วนรูปภาพ"
                >
                  <button
                    type="button"
                    className={ratio === 'square' ? 'active' : ''}
                    onClick={() => setRatio('square')}
                  >
                    1:1
                  </button>
                  <button
                    type="button"
                    className={ratio === 'portrait' ? 'active' : ''}
                    onClick={() => setRatio('portrait')}
                  >
                    4:5
                  </button>
                  <button
                    type="button"
                    className={ratio === 'story' ? 'active' : ''}
                    onClick={() => setRatio('story')}
                  >
                    9:16
                  </button>
                </div>
              </div>

              <div className="preview-stage">
                <div
                  className={`promo-card ratio-${ratio} ${loading ? 'is-loading' : ''}`}
                >
                  <Image
                    src="/pad-krapao-promo.png"
                    alt="ข้าวกะเพราไข่ดาวสำหรับโปรโมชันร้านอาหาร"
                    fill
                    priority
                    sizes="(max-width: 1023px) 90vw, 48vw"
                  />
                  <div className="promo-shade" />
                  <div className="promo-topline">
                    <span>{result.restaurant}</span>
                    <span className="promo-badge">พร้อมเสิร์ฟ</span>
                  </div>
                  <div className="promo-copy">
                    <span className="eyebrow">เมนูฮิตประจำสัปดาห์</span>
                    <h3>{result.offer}</h3>
                    <p>{result.menu}</p>
                    <div className="price-pill">{result.price}</div>
                  </div>
                  {loading && (
                    <div className="loading-overlay">
                      <LoaderCircle className="size-8 animate-spin text-primary" />
                      <span>AI กำลังจัดจาน...</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <aside id="caption" className="panel caption-panel">
              <div className="panel-heading compact">
                <div className="flex items-center gap-2">
                  <Camera className="size-4 text-primary" />
                  <h2>แคปชันสำหรับ {result.channel}</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyCaption}
                  className="text-[#c5c3ba] hover:bg-white/10 hover:text-white"
                >
                  {copied ? (
                    <Check className="size-4 text-emerald-400" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                </Button>
              </div>
              <div className="p-5 sm:p-6">
                <p className="whitespace-pre-line text-[15px] leading-7 text-[#d3d1c9]">
                  {caption}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-[#dedbd2]">{label}</span>
      {children}
    </label>
  );
}

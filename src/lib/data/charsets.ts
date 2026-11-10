/**
 * Unicode character picker data. Single characters get their official names
 * from the lazily-loaded name table; multi-character items carry a label.
 */

import { MARKS } from "../unicode/marks";
import { segmentGraphemes } from "../unicode/segment";

export interface PickerItem {
  value: string;
  /** Text shown on the tile (combining marks are shown on a dotted circle). */
  display: string;
  /** Optional label; single characters are named from the Unicode name table. */
  label?: string;
}

export interface PickerCategory {
  id: string;
  label: string;
  items: PickerItem[];
}

const chars = (s: string): PickerItem[] =>
  Array.from(new Set(segmentGraphemes(s).filter((g) => g.trim() !== ""))).map((g) => ({ value: g, display: g }));

const labelled = (list: [string, string][]): PickerItem[] => list.map(([value, label]) => ({ value, display: value, label }));

const SPACE_CODES = ["NBSP", "ENSP", "EMSP", "THSP", "HSP", "IDSP", "ZWSP", "ZWJ", "WJ", "BRL", "HF"];

export const PICKER_CATEGORIES: PickerCategory[] = [
  {
    id: "popular",
    label: "Popular",
    items: chars("✦✧★☆✩✪⋆✨❀✿❁♡♥❤❥❣☾☽☼☁⚡☯✞†‡☠☬༒꧁꧂彡乂亗〆ツ×÷∞°•·∙◦○●◎◉【】『』「」▲△▼▽◆◇"),
  },
  {
    id: "triangles",
    label: "Triangles",
    items: [
      { value: "\u{20E4}", display: "\u{25CC}\u{20E4}", label: "Combining enclosing upward pointing triangle" },
      ...chars("△▲▴▵▷▶▸▹►▻▽▼▾▿◁◀◂◃◄◅◬◭◮⟁⧊⧋⊿◸◹◺◿◢◣◤◥🔺🔻"),
    ],
  },
  {
    id: "stars",
    label: "Stars & Sparkles",
    items: chars("★☆✦✧✩✪✫✬✭✮✯✰✱✲✳✴✵✶✷✸✹✺✻✼✽✾⁂⁎⁑✢✣✤✥⋆⊹⟡✨💫🌟⭐"),
  },
  { id: "hearts", label: "Hearts & Flowers", items: chars("♡♥❤❥❣❦❧ღდʚɞ✿❀❁✾❃❋✽⚘🌸🌷🌹💐") },
  {
    id: "arrows",
    label: "Arrows",
    items: chars("←↑→↓↔↕↖↗↘↙⇐⇑⇒⇓⇔⇕➔➘➙➚➛➜➝➞➟➠➡➢➣➤➥➦➧➨➩➪➫➬➭➮➯➱➲➳➴➵➶➷➸➹➺➻➼➽➾⟵⟶⟷↺↻⤴⤵"),
  },
  {
    id: "brackets",
    label: "Brackets",
    items: chars("【】〖〗「」『』〈〉《》〔〕［］｛｝（）⟦⟧⟨⟩⟪⟫⦅⦆⦇⦈❨❩❪❫❬❭❮❯❰❱❲❳❴❵〘〙〚〛﴾﴿"),
  },
  {
    id: "lines",
    label: "Lines & Borders",
    items: chars("─━│┃┄┅┆┇┈┉┊┋┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬╭╮╯╰╱╲╳▔▁▏▕︻︼﹏﹋﹌‿⁀"),
  },
  { id: "blocks", label: "Blocks & Shades", items: chars("░▒▓█▀▄▌▐▖▗▘▙▚▛▜▝▞▟■□▢▣▤▥▦▧▨▩▪▫▬▭▮▯") },
  {
    id: "shapes",
    label: "Shapes",
    items: chars("◆◇◈◊○◌◍◎●◐◑◒◓◔◕◖◗◘◙◚◛◜◝◞◟◠◡◦◧◨◩◪◫◯⬟⬢⬡⬣⬤⬥⬦⬧⬨⬩⬪⬫⬬⬭⬮⬯"),
  },
  {
    id: "gaming",
    label: "Gaming & Clan",
    items: [
      ...chars("꧁꧂༒☬✞☠⚔彡乂亗〆么乛ツ㋡⚡♛♚♕♔✪⌖⊕☢☣"),
      ...labelled([
        ["\u{00D7}\u{035C}\u{00D7}", "Dead eyes"],
        ["\u{1D3E}\u{1D3F}\u{1D3C}", "Superscript PRO"],
        ["\u{2584}\u{FE3B}\u{30C7}\u{2550}\u{2550}\u{2501}\u{4E00}", "Sniper rifle"],
        ["\u{FE3B}\u{2566}\u{2564}\u{2500}", "Gun"],
        ["\u{2605}\u{5F61}", "Shooting star"],
        ["\u{A9C1}\u{0F12}\u{262C}", "Royal left wing"],
        ["\u{262C}\u{0F12}\u{A9C2}", "Royal right wing"],
      ]),
    ],
  },
  {
    id: "kaomoji",
    label: "Kaomoji",
    items: labelled([
      ["(\u{25D5}\u{203F}\u{25D5})", "Happy"],
      ["\u{0295}\u{2022}\u{1D25}\u{2022}\u{0294}", "Bear"],
      ["\u{00AF}\\_(\u{30C4})_/\u{00AF}", "Shrug"],
      ["(\u{256F}\u{00B0}\u{25A1}\u{00B0})\u{256F}\u{FE35} \u{253B}\u{2501}\u{253B}", "Table flip"],
      ["(\u{3065}\u{FF61}\u{25D5}\u{203F}\u{203F}\u{25D5}\u{FF61})\u{3065}", "Hug"],
      ["\u{0CA0}_\u{0CA0}", "Disapproval"],
      ["(\u{1D54}\u{1D25}\u{1D54})", "Cute bear"],
      ["(\u{FF89}\u{25D5}\u{30EE}\u{25D5})\u{FF89}*:\u{FF65}\u{FF9F}\u{2727}", "Magic"],
      ["\u{0F3C} \u{3064} \u{25D5}_\u{25D5} \u{0F3D}\u{3064}", "Give"],
      ["(\u{2267}\u{25E1}\u{2266})", "Joy"],
      ["(\u{2310}\u{25A0}_\u{25A0})", "Cool"],
      ["\u{00AC}\u{203F}\u{00AC}", "Smug"],
      ["(\u{261E}\u{FF9F}\u{30EE}\u{FF9F})\u{261E}", "Point"],
      ["(\u{273F}\u{25E0}\u{203F}\u{25E0})", "Flower smile"],
      ["\u{2299}\u{FE4F}\u{2299}", "Shocked"],
      ["(\u{2565}\u{FE4F}\u{2565})", "Crying"],
    ]),
  },
  {
    id: "dividers",
    label: "Dividers",
    items: labelled([
      ["\u{22C6}\u{FF61}\u{00B0}\u{2729}\u{208A}\u{02DA}.\u{22C6}", "Starry"],
      ["\u{2022}\u{00B0}\u{2022}\u{00B0}\u{2022}\u{00B0}\u{2022}", "Dots"],
      ["\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}", "Heavy line"],
      ["\u{25E6}\u{2022}\u{25CF}\u{25C9}\u{273F}\u{25C9}\u{25CF}\u{2022}\u{25E6}", "Flower bead"],
      ["\u{2727}\u{FF65}\u{FF9F}: *\u{2727}\u{FF65}\u{FF9F}:*", "Sparkle trail"],
      ["\u{2022}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{22C5}\u{263E}\u{263D}\u{22C5}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2022}", "Moon divider"],
      ["\u{2508}\u{2508}\u{2508}\u{2508}\u{2508}\u{2508}", "Dashed"],
      ["\u{A4B0}\u{09CC} \u{0ED2}\u{A4B1}", "Bow"],
      ["\u{0B68}\u{0B67}", "Ribbon"],
      ["\u{22C6}\u{02D9}\u{27E1}", "Twinkle"],
      ["\u{2726}\u{2022}\u{2508}\u{0E51}\u{22C5}\u{22EF} \u{22EF}\u{22C5}\u{0E51}\u{2508}\u{2022}\u{2726}", "Ornate"],
      ["\u{2554}\u{2550}\u{2550}\u{2550}\u{2550}\u{2557}", "Box top"],
      ["\u{255A}\u{2550}\u{2550}\u{2550}\u{2550}\u{255D}", "Box bottom"],
    ]),
  },
  { id: "math", label: "Math", items: chars("±×÷∞≈≠≤≥√∑∏∫∂∆∇∈∉∩∪⊂⊃⊆⊇∀∃∄∅∧∨¬⊕⊗⊥∥∠∟∴∵∷≡≅∝∮") },
  { id: "currency", label: "Currency", items: chars("$¢£¤¥₠₡₢₣₤₥₦₧₨₩₪₫€₭₮₯₰₱₲₳₴₵₶₷₸₹₺₻₼₽₾₿") },
  { id: "music", label: "Music & Signs", items: chars("♩♪♫♬♭♮♯☀☁☂☃☄☾☽☼☯☮☢☣☤☥☦☧☨☩☪☫☬☭☸♀♂⚢⚣⚤⚥⚦⚧♈♉♊♋♌♍♎♏♐♑♒♓") },
  { id: "cards", label: "Chess & Cards", items: chars("♔♕♖♗♘♙♚♛♜♝♞♟♠♡♢♣♤♥♦♧⚀⚁⚂⚃⚄⚅") },
  {
    id: "small",
    label: "Tiny Letters",
    items: chars("ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ⁰¹²³⁴⁵⁶⁷⁸⁹ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘʀꜱᴛᴜᴠᴡʏᴢₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ"),
  },
  {
    id: "marks",
    label: "Combining Marks",
    items: MARKS.map((m) => ({ value: m.char, display: `\u{25CC}${m.char}`, label: `${m.name} (${m.label})` })),
  },
  {
    id: "spaces",
    label: "Spaces & Invisible",
    items: labelled([
      ["\u{00A0}", "No-break space"],
      ["\u{2002}", "En space"],
      ["\u{2003}", "Em space"],
      ["\u{2009}", "Thin space"],
      ["\u{200A}", "Hair space"],
      ["\u{3000}", "Ideographic space"],
      ["\u{200B}", "Zero width space"],
      ["\u{200D}", "Zero width joiner"],
      ["\u{2060}", "Word joiner"],
      ["\u{2800}", "Braille pattern blank"],
      ["\u{3164}", "Hangul filler"],
    ]).map((it, i) => ({ ...it, display: SPACE_CODES[i] })),
  },
];

export const PICKER_CATEGORY_BY_ID = new Map(PICKER_CATEGORIES.map((c) => [c.id, c]));

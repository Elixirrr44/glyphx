/**
 * Emoji catalog for the picker. Category strings are segmented into grapheme
 * clusters at load time, so multi-code-point emoji stay whole.
 */

import { isEmojiGrapheme, segmentGraphemes } from "../unicode/segment";

export interface EmojiCategory {
  id: string;
  label: string;
  icon: string;
  emojis: string[];
}

const RE_TEXT_DEFAULT = /^\p{Extended_Pictographic}$/u;

/** Split into graphemes; text-default pictographs get VS16 so they render as emoji. */
const split = (s: string) =>
  Array.from(
    new Set(
      segmentGraphemes(s)
        .filter((g) => g.trim() !== "")
        .map((g) => (RE_TEXT_DEFAULT.test(g) && !isEmojiGrapheme(g) ? g + "\u{FE0F}" : g)),
    ),
  );

const RAW: [string, string, string, string][] = [
  ["smileys", "Smileys", "😀", "😀😃😄😁😆😅🤣😂🙂🙃🫠😉😊😇🥰😍🤩😘😗😚😙🥲😋😛😜🤪😝🤑🤗🤭🫢🫣🤫🤔🫡🤐🤨😐😑😶🫥😏😒🙄😬🤥🫨😌😔😪🤤😴😷🤒🤕🤢🤮🤧🥵🥶🥴😵🤯🤠🥳🥸😎🤓🧐😕🫤😟🙁😮😯😲😳🥺🥹😦😧😨😰😥😢😭😱😖😣😞😓😩😫🥱😤😡😠🤬😈👿💀👻👽👾🤖💩🤡👹👺😺😸😹😻😼😽🙀😿😾"],
  ["people", "People & Hands", "👋", "👋🤚🖐✋🖖🫱🫲🫳🫴👌🤌🤏✌🤞🫰🤟🤘🤙👈👉👆🖕👇☝🫵👍👎✊👊🤛🤜👏🙌🫶👐🤲🤝🙏✍💅🤳💪🦾🦵🦶👂🦻👃👀👁👅👄🫦👶🧒👦👧🧑👱👨🧔👩🧓👴👵🙍🙎🙅🙆💁🙋🧏🙇🤦🤷👮🕵💂🥷👷🫅🤴👸👳👲🧕🤵👰🤰🫄🤱👼🎅🤶🦸🦹🧙🧚🧛🧜🧝🧞🧟💆💇🚶🧍🧎🏃💃🕺🧖🧗🏇🏂🏄🚣🏊🏋🚴🚵🤸🤼🤽🤾🤹🧘"],
  ["hearts", "Hearts", "💜", "❤\u{FE0F}🧡💛💚💙🩵💜🤎🖤🩶🤍🩷💔❣\u{FE0F}💕💞💓💗💖💘💝💟❤\u{FE0F}\u{200D}🔥❤\u{FE0F}\u{200D}🩹💌💋"],
  ["nature", "Animals & Nature", "🦋", "🐶🐱🐭🐹🐰🦊🐻🐼🐻\u{200D}❄\u{FE0F}🐨🐯🦁🐮🐷🐸🐵🙈🙉🙊🐔🐧🐦🐤🦆🦅🦉🦇🐺🐗🐴🦄🐝🪲🐛🦋🐌🐞🐜🪰🕷\u{FE0F}🕸\u{FE0F}🦂🐢🐍🦎🦖🦕🐙🦑🦐🦞🦀🐡🐠🐟🐬🐳🐋🦈🐊🐅🐆🦓🦍🦧🐘🦛🦏🐪🐫🦒🦘🦬🐃🐂🐄🐎🐖🐏🐑🦙🐐🦌🐕🐩🐈🐈\u{200D}⬛🐓🦃🦤🦚🦜🦢🦩🕊\u{FE0F}🐇🦝🦨🦡🦫🦦🦥🐁🐀🐿\u{FE0F}🦔🐉🐲🌵🎄🌲🌳🌴🪵🌱🌿☘\u{FE0F}🍀🎍🪴🎋🍃🍂🍁🪺🍄🐚🪸🌾💐🌷🌹🥀🪷🌺🌸🌼🌻"],
  ["sky", "Sky & Weather", "🌙", "🌞🌝🌛🌜🌚🌕🌖🌗🌘🌑🌒🌓🌔🌙🌎🌍🌏🪐💫⭐🌟✨⚡☄\u{FE0F}💥🔥🌪\u{FE0F}🌈☀\u{FE0F}🌤\u{FE0F}⛅🌥\u{FE0F}☁\u{FE0F}🌦\u{FE0F}🌧\u{FE0F}⛈\u{FE0F}🌩\u{FE0F}🌨\u{FE0F}❄\u{FE0F}☃\u{FE0F}⛄🌬\u{FE0F}💨💧💦🫧☔☂\u{FE0F}🌊🌫\u{FE0F}"],
  ["food", "Food & Drink", "🍓", "🍏🍎🍐🍊🍋🍌🍉🍇🍓🫐🍈🍒🍑🥭🍍🥥🥝🍅🍆🥑🥦🥬🥒🌶\u{FE0F}🫑🌽🥕🫒🧄🧅🥔🍠🥐🥯🍞🥖🥨🧀🥚🍳🧈🥞🧇🥓🥩🍗🍖🌭🍔🍟🍕🥪🌮🌯🫔🥗🍝🍜🍲🍛🍣🍱🥟🍤🍙🍚🍘🍥🥮🍢🍡🍧🍨🍦🥧🧁🍰🎂🍮🍭🍬🍫🍿🍩🍪🌰🥜🍯🥛🍼☕🫖🍵🧃🥤🧋🍶🍺🍻🥂🍷🥃🍸🍹🍾🧊"],
  ["activities", "Activities & Gaming", "🎮", "⚽🏀🏈⚾🥎🎾🏐🏉🥏🎱🪀🏓🏸🏒🏑🥍🏏🪃🥅⛳🪁🏹🎣🤿🥊🥋🎽🛹🛼🛷⛸\u{FE0F}🥌🎿🎯🎮🕹\u{FE0F}🎰🎲🧩♟\u{FE0F}🎭🎨🎬🎤🎧🎼🎹🥁🪘🎷🎺🪗🎸🪕🎻🏆🥇🥈🥉🏅🎖\u{FE0F}🎗\u{FE0F}🎫🎟\u{FE0F}🎪🃏🀄🎴"],
  ["travel", "Travel & Space", "🚀", "🚀🛸🛰\u{FE0F}✈\u{FE0F}🚁🚂🚗🏎\u{FE0F}🏍\u{FE0F}🚲🛴⛵🚤🛳\u{FE0F}🗺\u{FE0F}🗽🗼🏰🏯🎡🎢🌋🗻🏕\u{FE0F}🏖\u{FE0F}🏝\u{FE0F}🌅🌄🌠🎇🎆🌇🌆🏙\u{FE0F}🌃🌌🌉🌁"],
  ["objects", "Objects", "💎", "⌚📱💻⌨\u{FE0F}🖥\u{FE0F}🖱\u{FE0F}💾💿📷📸📹🎥📞☎\u{FE0F}📺📻🎙\u{FE0F}⏰⌛⏳📡🔋🔌💡🔦🕯\u{FE0F}💸💵💰💳💎⚖\u{FE0F}🧰🔧🔨⚒\u{FE0F}🛠\u{FE0F}⛏\u{FE0F}🔩⚙\u{FE0F}🧱⛓\u{FE0F}🧲💣🧨🪓🔪🗡\u{FE0F}⚔\u{FE0F}🛡\u{FE0F}⚰\u{FE0F}🪦⚱\u{FE0F}🏺🔮📿🧿🪬💈⚗\u{FE0F}🔭🔬🕳\u{FE0F}💊💉🩸🧬🦠🧪🌡\u{FE0F}🧹🔑🗝\u{FE0F}🚪🪑🛋\u{FE0F}🛏\u{FE0F}🧸🪆🖼\u{FE0F}🪞🪟🛍\u{FE0F}🛒🎁🎈🎏🎀🪄🪅🎊🎉🎎🏮🎐🧧✉\u{FE0F}📩📦🏷\u{FE0F}📜📃📄📑📊📈📉🗒\u{FE0F}🗓\u{FE0F}📆📅🗑\u{FE0F}📋📁📂📰📓📔📒📕📗📘📙📚📖🔖🧷🔗📎📐📏📌📍✂\u{FE0F}🖊\u{FE0F}🖋\u{FE0F}✒\u{FE0F}🖌\u{FE0F}🖍\u{FE0F}📝✏\u{FE0F}🔍🔎🔏🔐🔒🔓"],
  ["symbols", "Symbols", "🔣", "☮\u{FE0F}✝\u{FE0F}☪\u{FE0F}🕉\u{FE0F}☸\u{FE0F}✡\u{FE0F}🔯🕎☯\u{FE0F}☦\u{FE0F}⛎♈♉♊♋♌♍♎♏♐♑♒♓⚛\u{FE0F}☢\u{FE0F}☣\u{FE0F}✴\u{FE0F}🆚💮🅰\u{FE0F}🅱\u{FE0F}🆎🆑🅾\u{FE0F}🆘❌⭕🛑⛔📛🚫💯💢♨\u{FE0F}🔞📵❗❕❓❔‼\u{FE0F}⁉\u{FE0F}〽\u{FE0F}⚠\u{FE0F}🔱⚜\u{FE0F}🔰♻\u{FE0F}✅💹❇\u{FE0F}✳\u{FE0F}❎🌐💠Ⓜ\u{FE0F}🌀💤🆔🆕🆓🆒🆗🆙0\u{FE0F}\u{20E3}1\u{FE0F}\u{20E3}2\u{FE0F}\u{20E3}3\u{FE0F}\u{20E3}4\u{FE0F}\u{20E3}5\u{FE0F}\u{20E3}6\u{FE0F}\u{20E3}7\u{FE0F}\u{20E3}8\u{FE0F}\u{20E3}9\u{FE0F}\u{20E3}🔟#\u{FE0F}\u{20E3}*\u{FE0F}\u{20E3}▶\u{FE0F}⏸\u{FE0F}⏹\u{FE0F}⏺\u{FE0F}⏭\u{FE0F}⏮\u{FE0F}⏩⏪🔼🔽➡\u{FE0F}⬅\u{FE0F}⬆\u{FE0F}⬇\u{FE0F}↗\u{FE0F}↘\u{FE0F}↙\u{FE0F}↖\u{FE0F}↕\u{FE0F}↔\u{FE0F}↪\u{FE0F}↩\u{FE0F}⤴\u{FE0F}⤵\u{FE0F}🔀🔁🔂🔄🎵🎶➕➖➗✖\u{FE0F}🟰♾\u{FE0F}💲™\u{FE0F}©\u{FE0F}®\u{FE0F}〰\u{FE0F}➰➿✔\u{FE0F}☑\u{FE0F}🔘🔴🟠🟡🟢🔵🟣⚫⚪🟤🔺🔻🔸🔹🔶🔷🔳🔲▪\u{FE0F}▫\u{FE0F}◾◽◼\u{FE0F}◻\u{FE0F}🟥🟧🟨🟩🟦🟪⬛⬜🟫🔔🔕📣📢💬💭🗯\u{FE0F}♠\u{FE0F}♣\u{FE0F}♥\u{FE0F}♦\u{FE0F}"],
  [
    "flags",
    "Flags",
    "🏁",
    "🏁🚩🎌🏴🏳\u{FE0F}🏳\u{FE0F}\u{200D}🌈🏳\u{FE0F}\u{200D}⚧\u{FE0F}🏴\u{200D}☠\u{FE0F}🇺🇸🇬🇧🇨🇦🇦🇺🇯🇵🇰🇷🇨🇳🇮🇳🇧🇷🇲🇽🇫🇷🇩🇪🇮🇹🇪🇸🇵🇹🇳🇱🇸🇪🇳🇴🇫🇮🇩🇰🇵🇱🇺🇦🇹🇷🇸🇦🇦🇪🇪🇬🇳🇬🇿🇦🇰🇪🇦🇷🇨🇴🇨🇱🇵🇪🇵🇭🇮🇩🇻🇳🇹🇭🇲🇾🇸🇬🇳🇿🇮🇪🇨🇭🇦🇹🇧🇪🇬🇷🇮🇱🇵🇰🇧🇩🇯🇲🇨🇺🇬🇭🇪🇹🇲🇦" +
      "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}" +
      "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}" +
      "\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}",
  ],
];

export const EMOJI_CATEGORIES: EmojiCategory[] = RAW.map(([id, label, icon, s]) => ({ id, label, icon, emojis: split(s) }));

export const SKIN_TONES = [
  { id: "none", label: "Default", modifier: "" },
  { id: "light", label: "Light", modifier: "\u{1F3FB}" },
  { id: "medium-light", label: "Medium-light", modifier: "\u{1F3FC}" },
  { id: "medium", label: "Medium", modifier: "\u{1F3FD}" },
  { id: "medium-dark", label: "Medium-dark", modifier: "\u{1F3FE}" },
  { id: "dark", label: "Dark", modifier: "\u{1F3FF}" },
] as const;

const RE_MODIFIER_BASE = /^\p{Emoji_Modifier_Base}/u;

export function supportsSkinTone(emoji: string): boolean {
  return RE_MODIFIER_BASE.test(emoji) && !emoji.includes("\u{200D}");
}

/** Apply a Fitzpatrick modifier, replacing VS16 / existing modifiers. */
export function withSkinTone(emoji: string, modifier: string): string {
  if (!modifier || !supportsSkinTone(emoji)) return emoji;
  const base = Array.from(emoji)[0];
  return base + modifier;
}

/** Map a two-letter regional-indicator flag back to its region code. */
export function flagRegion(emoji: string): string | null {
  const cps = Array.from(emoji).map((c) => c.codePointAt(0)!);
  if (cps.length === 2 && cps.every((cp) => cp >= 0x1f1e6 && cp <= 0x1f1ff)) {
    return cps.map((cp) => String.fromCharCode(cp - 0x1f1e6 + 65)).join("");
  }
  return null;
}

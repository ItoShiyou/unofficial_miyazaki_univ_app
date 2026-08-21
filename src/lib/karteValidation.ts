/**
 * 授業カルテの自由記述欄（advice・comment）に、教員個人への人格攻撃・
 * 外見への言及が含まれていないかを投稿前に検知する。
 * 実データレビューで、RateMyProfessorsの投稿ガイドライン（"Do not comment on
 * a Professor's appearance, dress, age, gender or race"）が投稿前の抑制策として
 * 機能している一方、本アプリには事前の抑制が皆無だったと判明したため追加した。
 *
 * 授業内容への正当な批判（「厳しい」「分かりにくい」等）まで誤検知しないよう、
 * 授業評価とは無関係な、明確な人格攻撃・侮辱・外見言及の語句のみを対象にする。
 *
 * 実データレビューで、素の文字列一致は「ば　か」（スペース挿入）「ﾌﾞｽ」（半角カナ）
 * のような簡単な表記ゆれで容易に回避できると判明した。悪意ある確信犯的な荒らしまでは
 * 防ぎきれない（最終防衛線は通報フロー）が、うっかり投稿の抑止という目的に対しては、
 * 比較前にNFKC正規化＋空白・記号除去を行うだけで費用対効果よく回避耐性を上げられる。
 */
const PERSONAL_ATTACK_WORDS = [
  "ブサイク",
  "きもい",
  "キモい",
  "デブ",
  "ハゲ",
  "ブス",
  "老害",
  "馬鹿",
  "バカ",
  "ばか",
  "アホ",
  "あほ",
  "死ね",
  "きしょい",
  "気持ち悪い",
];

// 全角/半角の統一（NFKC）に加え、空白・句読点・中黒等の区切り記号を除去してから比較する。
const STRIP_PATTERN = /[\s。、・.,！!?？\-ー]/g;

function normalize(text: string): string {
  return text.normalize("NFKC").replace(STRIP_PATTERN, "");
}

export function containsPersonalAttack(text: string): boolean {
  const normalized = normalize(text);
  return PERSONAL_ATTACK_WORDS.some((w) => normalized.includes(normalize(w)));
}

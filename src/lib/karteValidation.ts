/**
 * 授業カルテの自由記述欄（advice・comment）に、教員個人への人格攻撃・
 * 外見への言及が含まれていないかを投稿前に検知する。
 * 実データレビューで、RateMyProfessorsの投稿ガイドライン（"Do not comment on
 * a Professor's appearance, dress, age, gender or race"）が投稿前の抑制策として
 * 機能している一方、本アプリには事前の抑制が皆無だったと判明したため追加した。
 *
 * 授業内容への正当な批判（「厳しい」「分かりにくい」等）まで誤検知しないよう、
 * 授業評価とは無関係な、明確な人格攻撃・侮辱・外見言及の語句のみを対象にする。
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
  "アホ",
  "死ね",
  "きしょい",
  "気持ち悪い",
];

export function containsPersonalAttack(text: string): boolean {
  return PERSONAL_ATTACK_WORDS.some((w) => text.includes(w));
}

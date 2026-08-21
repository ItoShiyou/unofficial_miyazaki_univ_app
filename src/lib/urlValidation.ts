/**
 * 求人・協賛の外部リンク（applicationUrl・sponsor.url）が http(s) スキームであることを
 * 確認する。唯一の入力者は運営者本人（curl・管理画面）で第三者が注入できる経路は無いが、
 * 実データレビューで、運営者が誤って`javascript:`スキーム等を登録した場合に
 * リンククリック時にスクリプトが実行されてしまうリスクが指摘されたため、
 * 低コストな保険として追加した。
 */
export function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

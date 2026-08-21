"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card } from "@/components/ui";

type JobPosting = {
  id: string;
  companyName: string;
  industry: string | null;
  jobType: string;
  postingType: string;
  description: string;
  location: string | null;
  employmentType: string | null;
  workPeriod: string | null;
  targetGrade: string | null;
  applicationUrl: string;
  deadline: string | null;
  area: string | null;
  featured: boolean;
};

const POSTING_TYPE_LABEL: Record<string, string> = {
  job: "求人",
  internship: "インターン",
  info_session: "説明会",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobPosting[] | null>(null);

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data) => setJobs(data.jobs ?? []))
      .catch(() => setJobs([]));
  }, []);

  return (
    <main className="flex-1 flex flex-col px-4 pb-8">
      <PageHeader title="宮崎の企業から" />
      <p className="text-sm text-gray-500 px-0.5 pb-4">
        宮崎県内の企業・団体からの求人・インターン・説明会情報です。応募は各企業の応募先へ直接お進みください（本アプリが応募を仲介することはありません）。
      </p>

      {jobs === null && (
        <p className="text-sm text-gray-400 text-center py-10">読み込み中…</p>
      )}

      {jobs !== null && jobs.length === 0 && (
        <Card>
          <p className="text-sm text-gray-500 text-center py-6">
            まだ掲載がありません。
            <br />
            宮崎県内で求人・インターン・説明会情報の掲載にご興味のある企業様は、開発者までご連絡ください。
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {jobs?.map((j) => (
          <Card key={j.id} className={j.featured ? "border-amber-300 bg-amber-50/30" : ""}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-block text-[11px] font-medium text-blue-700 bg-blue-50 rounded-full px-2 py-0.5 mb-1">
                  {POSTING_TYPE_LABEL[j.postingType] ?? "求人"}
                  {j.area ? ` ・ ${j.area}` : ""}
                </span>
                {j.featured && (
                  <span className="inline-block text-[11px] font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 mb-1 ml-1">
                    注目
                  </span>
                )}
                <h3 className="text-sm font-bold">{j.companyName}</h3>
                <p className="text-xs text-gray-500">{j.jobType}</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-1.5 whitespace-pre-wrap">{j.description}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-gray-400">
              {j.location && <span>勤務地・実施場所：{j.location}</span>}
              {j.employmentType && <span>{j.employmentType}</span>}
              {j.workPeriod && <span>期間：{j.workPeriod}</span>}
              {j.targetGrade && <span>対象：{j.targetGrade}</span>}
              {j.deadline && (
                <span>締切：{new Date(j.deadline).toLocaleDateString("ja-JP")}</span>
              )}
            </div>
            <a
              href={j.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                fetch(`/api/jobs/${j.id}/click`, { method: "POST" }).catch(() => {});
              }}
              className="block text-xs text-blue-600 mt-2"
            >
              応募・詳細ページへ →
            </a>
          </Card>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2.5 leading-relaxed">
          掲載企業・団体様の情報については確認のうえ掲載していますが、本アプリまたは宮崎大学が企業の信頼性・安全性を保証・審査するものではありません。
          アルバイト・就活を装った詐欺など、実在の求人を装った悪質な事例も報告されています。応募の際は、労働条件・企業情報をご自身でも十分にご確認ください。
          不審な点があれば、開発者または最寄りの労働基準監督署等にご相談ください。
        </p>
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          本ページは求人情報の掲示のみを行うものであり、本アプリが学生と企業のあっせん・仲介を行うものではありません。
          <br />
          宮崎県内で学生向けの求人・インターン・説明会情報の掲載にご興味のある企業様・団体様は
          <br />
          開発者までご連絡ください。
        </p>
      </div>
    </main>
  );
}

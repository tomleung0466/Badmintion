"use client"

import { useState } from "react"
import type { Activity } from "@/types/activity"

interface ActivityCardProps {
  activity: Activity
  onRegister: () => void
}

export function ActivityCard({ activity, onRegister }: ActivityCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const isFull = activity.remainingSlots === 0

  const handleRegister = async () => {
    if (isFull || isLoading) return

    setIsLoading(true)
    // Simulate network delay for smooth animation
    await new Promise((resolve) => setTimeout(resolve, 600))
    onRegister()
    setIsLoading(false)
  }

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card transition-colors duration-300 hover:bg-[#fcfcfc]">
      <div className="p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.16em] text-muted-foreground">
              日期時間
            </p>
            <h3 className="mt-1 text-lg font-medium leading-[1.6] tracking-[0.05em] text-foreground">
              {activity.dateTime}
            </h3>
          </div>
          <span className="shrink-0 rounded-full border border-border px-3 py-1 text-xs tracking-[0.08em] text-muted-foreground">
            {isFull ? "已滿額" : `剩餘 ${activity.remainingSlots} 位`}
          </span>
        </div>

        <dl className="grid gap-3 border-y border-border py-4 text-sm leading-[1.6] tracking-[0.05em]">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">地點</dt>
            <dd className="text-right font-medium text-foreground">
              {activity.district} · {activity.venue}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">費用</dt>
            <dd className="font-medium text-foreground">
              ${activity.pricePerPerson} / 人
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">名額</dt>
            <dd className="font-medium text-foreground">
              {isFull ? "已滿額" : `剩餘 ${activity.remainingSlots} 位`}
            </dd>
          </div>
        </dl>

        <div className="pt-5">
          <button
            onClick={handleRegister}
            disabled={isFull || isLoading}
            className={`w-full rounded-lg border px-6 py-3 text-sm font-medium tracking-[0.08em] transition-colors duration-200 ${
              isFull
                ? "cursor-not-allowed border-border bg-muted text-muted-foreground"
                : isLoading
                  ? "border-border bg-secondary text-foreground"
                  : "border-border bg-secondary text-foreground hover:bg-[#e9e9e6] active:bg-muted"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                處理中
              </span>
            ) : isFull ? (
              "已滿額"
            ) : (
              "確認留位"
            )}
          </button>
        </div>
      </div>
    </article>
  )
}

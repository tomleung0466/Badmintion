"use client"

import { useRef, useEffect, useState } from "react"
import { Drawer } from "vaul"
import type { District } from "@/types/activity"

const districts: District[] = [
  "全港",
  "觀塘區",
  "將軍澳",
  "沙田區",
  "大埔區",
  "荃灣區",
  "灣仔區",
  "東區",
  "中西區",
  "油尖旺區",
  "九龍城區",
  "深水埗區",
  "黃大仙區",
  "屯門區",
  "元朗區",
  "北區",
  "西貢區",
  "葵青區",
  "離島區",
  "南區",
]

interface DistrictPickerProps {
  isOpen: boolean
  onClose: () => void
  selectedDistrict: District
  onSelectDistrict: (district: District) => void
}

export function DistrictPicker({
  isOpen,
  onClose,
  selectedDistrict,
  onSelectDistrict,
}: DistrictPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(
    districts.indexOf(selectedDistrict)
  )
  const itemHeight = 48

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      const index = districts.indexOf(selectedDistrict)
      scrollRef.current.scrollTop = index * itemHeight
      setActiveIndex(index)
    }
  }, [isOpen, selectedDistrict])

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollTop = scrollRef.current.scrollTop
      const newIndex = Math.round(scrollTop / itemHeight)
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < districts.length) {
        setActiveIndex(newIndex)
      }
    }
  }

  const handleConfirm = () => {
    onSelectDistrict(districts[activeIndex])
    onClose()
  }

  const handleItemClick = (index: number) => {
    setActiveIndex(index)
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: index * itemHeight,
        behavior: "smooth",
      })
    }
  }

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex flex-col rounded-t-[20px] bg-card">
          <div className="flex-1 rounded-t-[20px] bg-card">
            {/* Handle */}
            <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/20" />
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <button
                onClick={onClose}
                className="text-muted-foreground text-base font-medium"
              >
                取消
              </button>
              <h3 className="text-lg font-bold text-foreground">選擇地區</h3>
              <button
                onClick={handleConfirm}
                className="text-emerald font-bold text-base"
              >
                確定
              </button>
            </div>

            {/* Scroll Picker */}
            <div className="relative h-[240px] overflow-hidden">
              {/* Selection Highlight */}
              <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-12 bg-secondary rounded-xl pointer-events-none z-0" />
              
              {/* Gradient Overlays */}
              <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-card to-transparent pointer-events-none z-10" />
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-card to-transparent pointer-events-none z-10" />
              
              {/* Scrollable List */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
                style={{
                  paddingTop: `${(240 - itemHeight) / 2}px`,
                  paddingBottom: `${(240 - itemHeight) / 2}px`,
                }}
              >
                {districts.map((district, index) => (
                  <button
                    key={district}
                    onClick={() => handleItemClick(index)}
                    className={`w-full h-12 flex items-center justify-center snap-center transition-all duration-200 ${
                      index === activeIndex
                        ? "text-foreground text-xl font-bold"
                        : "text-muted-foreground text-base"
                    }`}
                  >
                    {district}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

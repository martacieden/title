"use client"

import { useState } from "react"
import { CategoryModal } from "@/components/category-modal"

export default function Home() {
  const [modalOpen, setModalOpen] = useState(true)

  return (
    <main className="min-h-screen">
      <CategoryModal open={modalOpen} onOpenChange={setModalOpen} />
    </main>
  )
}

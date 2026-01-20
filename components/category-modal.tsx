"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { X, ChevronDown, ChevronLeft, ChevronRight, MessageSquare, RefreshCw, Sparkles, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { getTemplatesByCategory, templateLibrary } from "@/lib/template-library"

interface CategoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const steps = [
  { number: 1, label: "Category details", key: "details" },
  { number: 2, label: "Title settings", key: "title" },
  { number: 3, label: "Select category capsules", key: "capsules" },
  { number: 4, label: "Set up custom fields", key: "custom" },
  { number: 5, label: "Select a workflow", key: "workflow" },
]

const stepIndexMap: Record<string, number> = {
  details: 0,
  title: 1,
  capsules: 2,
  custom: 3,
  workflow: 4,
}

const variables = {
  "System Fields": [
    { name: "{name}", example: "Category Name" },
    { name: "{creator}", example: "John Doe" },
    { name: "{organization}", example: "Сresset" },
    { name: "{due_date}", example: "03/15/2024" },
    { name: "{created_date}", example: "01/20/2024" },
    { name: "{freeform}", example: "User-entered text" },
  ],
  "Custom Fields": [
    { name: "{field.start}", example: "01/15/2024" },
    { name: "{field.end}", example: "01/20/2024" },
    { name: "{field.project_name}", example: "Summer Vacation" },
    { name: "{field.budget}", example: "$50,000" },
    { name: "{field.location}", example: "Building A" },
  ],
}

const aiSuggestions = [
  {
    template: "{creator} vacation / time off request",
    description: "Combines creator with vacation request type for clear context",
  },
  {
    template: "Vacation Request - {creator} ({field.start} - {field.end})",
    description: "Formal vacation request format with creator and date range",
  },
  {
    template: "Time Off: {creator} | {field.start} - {field.end}, 2024",
    description: "Alternative format with creator and date range",
  },
  {
    template: "{creator} vacation / time off request {field.start} {field.end}",
    description: "Combines creator, request type, and date range for comprehensive context",
  },
  {
    template: "{creator} Vacation Request {field.start} to {field.end}",
    description: "Formal vacation request format with date range",
  },
  {
    template: "{organization} - {creator} Time Off {field.start} {field.end}",
    description: "Focus on organization and creator for team context",
  },
  {
    template: "{creator} Time Off Request ({field.start} - {field.end})",
    description: "Alternative format with parentheses for date range",
  },
]

export function CategoryModal({ open, onOpenChange }: CategoryModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]))
  const [categoryName, setCategoryName] = useState("Vacation")
  const [categoryDescription, setCategoryDescription] = useState("")
  const [categoryIdea, setCategoryIdea] = useState("")
  const [isEnhanced, setIsEnhanced] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [templateEnabled, setTemplateEnabled] = useState(false)
  const [templateValue, setTemplateValue] = useState(aiSuggestions[0]?.template || "")
  const [showManualSetup, setShowManualSetup] = useState(false)
  const [currentAISuggestionIndex, setCurrentAISuggestionIndex] = useState(0)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number | null>(null)
  const [displayedSuggestions, setDisplayedSuggestions] = useState(aiSuggestions.slice(0, 3))
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false)
  const [showVariableDropdown, setShowVariableDropdown] = useState(false)
  const [showAISuggestions, setShowAISuggestions] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [previewText, setPreviewText] = useState("")
  const [templateErrors, setTemplateErrors] = useState<string[]>([])
  const templateInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const aiSuggestionsRef = useRef<HTMLDivElement>(null)

  const validateTemplate = (template: string): string[] => {
    const errors: string[] = []
    
    if (!template) {
      return errors // Порожній шаблон не є помилкою
    }

    // Отримуємо всі доступні змінні
    const allVariables = [
      ...variables["System Fields"].map(v => v.name),
      ...variables["Custom Fields"].map(v => v.name),
    ]

    // Перевірка на незакриті дужки
    const openBraces = (template.match(/\{/g) || []).length
    const closeBraces = (template.match(/\}/g) || []).length
    
    if (openBraces !== closeBraces) {
      errors.push("Unclosed braces: All { } must be properly closed")
    }

    // Знаходимо всі змінні в шаблоні
    const variableRegex = /\{([^}]+)\}/g
    const matches = template.matchAll(variableRegex)
    
    for (const match of matches) {
      const fullMatch = match[0] // {variable_name}
      const variableName = match[1] // variable_name
      
      // Перевіряємо, чи змінна існує
      if (!allVariables.includes(fullMatch)) {
        errors.push(`"${fullMatch}" is not a valid variable`)
      }
    }

    // Перевірка на невалідні символи всередині дужок
    const invalidPattern = /\{[^}\s]*\s[^}]*\}/g
    if (invalidPattern.test(template)) {
      const invalidMatches = template.match(invalidPattern)
      invalidMatches?.forEach(match => {
        if (!errors.some(e => e.includes(match))) {
          errors.push(`Invalid variable format: "${match}" (variables cannot contain spaces)`)
        }
      })
    }

    return errors
  }

  // Обробка переходу в manual mode через "Edit"
  const handleEditSuggestion = () => {
    if (selectedSuggestionIndex !== null && displayedSuggestions[selectedSuggestionIndex]) {
      const selectedTemplate = displayedSuggestions[selectedSuggestionIndex].template
      setTemplateValue(selectedTemplate)
      const errors = validateTemplate(selectedTemplate)
      setTemplateErrors(errors)
      setShowManualSetup(true)
    }
  }

  // Обробка переходу в manual mode через "Customize manually"
  const handleCustomizeManually = () => {
    setTemplateValue("")
    setTemplateErrors([])
    setShowManualSetup(true)
  }

  useEffect(() => {
    // Update preview with sample data
    if (templateValue) {
      const preview = generatePreviewText(templateValue)
      setPreviewText(preview)
    } else {
      setPreviewText("")
    }
  }, [templateValue])
  
  // Автоматично вибираємо першу опцію після завершення генерації
  useEffect(() => {
    if (templateEnabled && !showManualSetup && !isGeneratingSuggestions && displayedSuggestions.length > 0 && selectedSuggestionIndex === null) {
      // Нехай handleToggleEnabled керує вибором при включенні
      // Цей useEffect тільки для випадків, коли displayedSuggestions змінюються
    }
  }, [templateEnabled, showManualSetup, isGeneratingSuggestions, displayedSuggestions, selectedSuggestionIndex])

  useEffect(() => {
    // Оновлюємо пропозиції, якщо змінилася назва категорії і ми на кроці налаштування заголовка
    if (currentStep === 1 && templateEnabled && !showManualSetup && displayedSuggestions.length === 0) {
      refreshSuggestions(categoryName, true)
    }
  }, [currentStep, categoryName, templateEnabled, showManualSetup, displayedSuggestions])

  useEffect(() => {
    // Close dropdowns when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowVariableDropdown(false)
      }
      if (aiSuggestionsRef.current && !aiSuggestionsRef.current.contains(event.target as Node)) {
        setShowAISuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const insertVariable = (variable: string) => {
    const before = templateValue.substring(0, cursorPosition)
    const after = templateValue.substring(cursorPosition)
    const newValue = before + variable + after
    setTemplateValue(newValue)
    setCursorPosition(cursorPosition + variable.length)
    setShowVariableDropdown(false)
    
    // Валідація після вставки змінної
    if (templateEnabled && newValue) {
      const errors = validateTemplate(newValue)
      setTemplateErrors(errors)
    } else {
      setTemplateErrors([])
    }
    
    templateInputRef.current?.focus()
  }

  const insertAISuggestion = (suggestion: string) => {
    setTemplateValue(suggestion)
    setCursorPosition(suggestion.length)
    setShowAISuggestions(false)
    
    // Валідація після вставки AI suggestion
    if (templateEnabled && suggestion) {
      const errors = validateTemplate(suggestion)
      setTemplateErrors(errors)
    } else {
      setTemplateErrors([])
    }
    
    templateInputRef.current?.focus()
  }

  const goToPreviousSuggestion = () => {
    const newIndex = currentAISuggestionIndex === 0 
      ? aiSuggestions.length - 1 
      : currentAISuggestionIndex - 1
    setCurrentAISuggestionIndex(newIndex)
    // templateValue оновлюється через useEffect
  }

  const goToNextSuggestion = () => {
    const newIndex = currentAISuggestionIndex === aiSuggestions.length - 1 
      ? 0 
      : currentAISuggestionIndex + 1
    setCurrentAISuggestionIndex(newIndex)
    // templateValue оновлюється через useEffect
  }

  // Генерація preview тексту з реальними значеннями
  const generatePreviewText = (template: string): string => {
    let preview = template
    // Замінюємо змінні на приклади (в правильному порядку, щоб уникнути конфліктів)
    // Спочатку складніші паттерни
    preview = preview.replace(/{field.start}/g, "Dec 15")
    preview = preview.replace(/{field.end}/g, "Dec 20")
    preview = preview.replace(/{field.project_name}/g, "Summer Vacation")
    preview = preview.replace(/{field.budget}/g, "$50,000")
    preview = preview.replace(/{field.location}/g, "Building A")
    preview = preview.replace(/{field.employee_name}/g, "Alice Smith")
    preview = preview.replace(/{field.order_id}/g, "1234")
    preview = preview.replace(/{field.issue_type}/g, "Plumbing")
    preview = preview.replace(/{field.vendor}/g, "Amazon")
    preview = preview.replace(/{field.amount}/g, "$450.00")
    preview = preview.replace(/{field.asset_name}/g, "Apple Stock")
    preview = preview.replace(/{field.strategy}/g, "Growth")
    // Потім простіші
    preview = preview.replace(/{creator}/g, "John Doe")
    preview = preview.replace(/{organization}/g, "Cresset")
    preview = preview.replace(/{name}/g, "Vacation")
    preview = preview.replace(/{due_date}/g, "03/15/2024")
    preview = preview.replace(/{created_date}/g, "01/20/2024")
    preview = preview.replace(/{freeform}/g, "User-entered text")
    // Додаємо рік для шаблонів з датами, якщо його немає
    if (preview.includes("Dec 15 - Dec 20") && !preview.includes("2024")) {
      preview = preview.replace("Dec 15 - Dec 20", "Dec 15 - Dec 20, 2024")
    }
    return preview
  }

  // Функція для оновлення пропозицій на основі назви категорії
  const refreshSuggestions = (name: string, selectFirst = false) => {
    setIsGeneratingSuggestions(true)
    
    setTimeout(() => {
      const libraryMatches = getTemplatesByCategory(name)
      let newSuggestions = [...libraryMatches]

      if (newSuggestions.length < 3) {
        const remaining = 3 - newSuggestions.length
        const shuffledAI = [...aiSuggestions]
          .filter(ai => !newSuggestions.some(n => n.template === ai.template))
          .sort(() => Math.random() - 0.5)
        
        newSuggestions = [...newSuggestions, ...shuffledAI.slice(0, remaining)]
      }

      const finalOnes = newSuggestions.slice(0, 3)
      setDisplayedSuggestions(finalOnes)
      setIsGeneratingSuggestions(false)
      
      if (selectFirst && finalOnes.length > 0) {
        setSelectedSuggestionIndex(0)
        const selectedTemplate = finalOnes[0].template
        setTemplateValue(selectedTemplate)
        const errors = validateTemplate(selectedTemplate)
        setTemplateErrors(errors)
      }
    }, 1500)
  }

  // Генерація нових опцій
  const generateNewOptions = () => {
    setSelectedSuggestionIndex(null)
    refreshSuggestions(categoryName)
  }

  // Обробка включення тоглу
  const handleToggleEnabled = () => {
    const newValue = !templateEnabled
    setTemplateEnabled(newValue)
    
    if (newValue) {
      setSelectedSuggestionIndex(null)
      setTemplateValue("")
      refreshSuggestions(categoryName, true)
    } else {
      setSelectedSuggestionIndex(null)
      setTemplateValue("")
      setTemplateErrors([])
    }
  }

  // Обробка вибору AI suggestion
  const handleSelectSuggestion = (index: number) => {
    setSelectedSuggestionIndex(index)
    const selectedTemplate = displayedSuggestions[index].template
    setTemplateValue(selectedTemplate)
    const errors = validateTemplate(selectedTemplate)
    setTemplateErrors(errors)
  }

  const handleTemplateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setTemplateValue(newValue)
    setCursorPosition(e.currentTarget.selectionStart || 0)
    
    // Валідація в реальному часі
    if (templateEnabled && newValue) {
      const errors = validateTemplate(newValue)
      setTemplateErrors(errors)
    } else {
      setTemplateErrors([])
    }
  }

  const goToStep = (stepIndex: number) => {
    // Дозволяємо переходити на будь-який крок
    setCurrentStep(stepIndex)
    setVisitedSteps((prev) => new Set([...prev, stepIndex]))
  }

  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      setVisitedSteps((prev) => new Set([...prev, nextStep]))
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCreate = () => {
    // Логіка створення категорії
    onOpenChange(false)
  }

  const handleEnhance = () => {
    if (!categoryIdea.trim()) return

    setIsEnhancing(true)
    
    // Симуляція AI
    setTimeout(() => {
      // Логіка розбиття ідеї
      // Якщо в ідеї є "-", вважаємо це роздільником Title - Description
      // Інакше беремо перше речення або перші 5 слів як Title
      let title = ""
      let description = ""

      if (categoryIdea.includes("-")) {
        const parts = categoryIdea.split("-")
        title = parts[0].trim()
        description = parts.slice(1).join("-").trim()
      } else {
        const words = categoryIdea.split(" ")
        title = words.slice(0, 3).join(" ")
        if (words.length > 3) {
          description = words.slice(3).join(" ")
        }
      }

      // Додаємо трохи "професійності" для симуляції
      if (title.toLowerCase().includes("vacation")) {
        title = "Vacation Request"
      }
      
      setCategoryName(title)
      setCategoryDescription(description || categoryIdea)
      setIsEnhanced(true)
      setIsEnhancing(false)
    }, 1500)
  }

  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[800px] sm:!max-w-[800px] lg:!max-w-[800px] w-[98vw] max-w-none sm:max-w-none p-0 gap-0 h-[650px] overflow-hidden flex flex-col" showCloseButton={false}>
        {/* Header */}
        <div className="flex px-6 py-5 border-b border-[#E5E7EB] flex-row items-center gap-0 justify-between">
          <DialogTitle className="text-lg font-semibold text-[#111827]">Create new category</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#F3F4F6] transition-colors"
          >
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>

        {/* Main Layout */}
        <div className="flex flex-1 min-h-0">
          {/* Stepper Sidebar */}
          <div className="w-[240px] bg-[#F9FAFB] border-r border-[#E5E7EB]">
            <nav className="py-6 px-6">
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[14px] top-[14px] bottom-[14px] w-[2px] bg-[#E5E7EB]" />
                
                {steps.map((step, index) => {
                  const isActive = currentStep === index
                  const isVisited = visitedSteps.has(index)
                  
                  return (
                    <div key={step.key} className="relative flex items-start mb-6 last:mb-0">
                      {/* Step circle */}
                      <button
                        onClick={() => goToStep(index)}
                        className={cn(
                          "relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all flex-shrink-0 cursor-pointer hover:scale-105",
                          isActive
                            ? "bg-[#2563EB] text-white"
                            : isVisited
                            ? "bg-white border-2 border-[#2563EB] text-[#2563EB]"
                            : "bg-white border-2 border-[#D1D5DB] text-[#9CA3AF]"
                        )}
                      >
                        {step.number}
                      </button>
                      
                      {/* Step label */}
                <button
                        onClick={() => goToStep(index)}
                  className={cn(
                          "ml-3 text-left flex-1 pt-1 transition-colors cursor-pointer hover:text-[#2563EB]",
                          isActive
                            ? "text-[#2563EB] font-medium"
                            : isVisited
                            ? "text-[#111827]"
                            : "text-[#9CA3AF]"
                        )}
                      >
                        <div className="text-sm leading-tight whitespace-nowrap">
                          {step.label}
                        </div>
                </button>
                    </div>
                  )
                })}
              </div>
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto min-w-0">
            <div className="p-6 w-full max-w-full">
              {currentStep === 0 && (
                <div>
                  <h3 className="text-base font-semibold text-[#111827] mb-1">Enter category details</h3>
                  <p className="text-sm text-[#6B7280] mb-6">Enter a name and select the appropriate category type.</p>

                  <div className="space-y-5">
                    {!isEnhanced ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-[#374151] mb-1.5">
                            What would you like to create?
                          </label>
                          <Textarea
                            value={categoryIdea}
                            onChange={(e) => setCategoryIdea(e.target.value)}
                            placeholder="Describe your collection idea here... (e.g., 'A request form for team members to submit their upcoming holiday plans')"
                            className="min-h-[120px] resize-none"
                          />
                          <p className="text-xs text-[#6B7280] mt-2 italic">
                            Feel free to write in your own words. Our AI will polish it into a professional title and description for you!
                          </p>
                        </div>
                        <Button 
                          onClick={handleEnhance} 
                          disabled={!categoryIdea.trim() || isEnhancing}
                          className="w-full bg-[#F5F3FF] hover:bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE] shadow-none gap-2 font-medium"
                        >
                          {isEnhancing ? (
                            <Spinner className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          {isEnhancing ? "Enhancing..." : "Enhance with AI"}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-[#22C55E] flex items-center justify-center">
                              <Sparkles className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-sm font-medium text-[#166534]">Enhanced by AI</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsEnhanced(false)}
                            className="h-8 text-[#6B7280] hover:text-[#374151] hover:bg-[#F3F4F6] gap-1.5"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit Idea
                          </Button>
                        </div>

                        <div className="p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-4 shadow-sm">
                          <div>
                            <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                              Title
                            </label>
                            <input
                              type="text"
                              value={categoryName}
                              onChange={(e) => setCategoryName(e.target.value)}
                              placeholder="Enter title..."
                              className="w-full bg-white px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                              Description
                            </label>
                            <Textarea
                              value={categoryDescription}
                              onChange={(e) => setCategoryDescription(e.target.value)}
                              placeholder="Describe your category..."
                              className="min-h-[100px] bg-white resize-none border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                            />
                          </div>

                          <div className="flex justify-end pt-1">
                            <button 
                              onClick={handleEnhance} 
                              disabled={isEnhancing}
                              className="flex items-center gap-2 text-xs font-semibold text-[#64748B] hover:text-[#3B82F6] transition-colors group"
                            >
                              {isEnhancing ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                              )}
                              {isEnhancing ? "Enhancing..." : "Re-enhance"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-1.5">
                        Category type <span className="text-[#EF4444]">*</span>
                      </label>
                      <Select defaultValue="decisions">
                        <SelectTrigger className="w-full border border-[#D1D5DB]">
                          <SelectValue placeholder="Select category type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="decisions">Decisions</SelectItem>
                          <SelectItem value="tasks">Tasks</SelectItem>
                          <SelectItem value="projects">Projects</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-[#6B7280] mt-1 leading-[18px]">
                        Choose where this category will appear.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-1.5">Make this a subcategory of</label>
                      <Select>
                        <SelectTrigger className="w-full border border-[#D1D5DB]">
                          <SelectValue placeholder="Choose a parent category (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (Main category)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-[#6B7280] mt-1 leading-[18px]">
                        Leave empty for a main category, or select a parent to group it under.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-3">
                        Where can this category be used? <span className="text-[#EF4444]">*</span>
                      </label>
                      <RadioGroup defaultValue="selected-only" className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="selected-only" id="selected-only" />
                          <label htmlFor="selected-only" className="text-sm text-[#111827] cursor-pointer">
                            In selected organization only
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="selected-and-child" id="selected-and-child" />
                          <label htmlFor="selected-and-child" className="text-sm text-[#111827] cursor-pointer">
                            In selected and all its child organizations
                          </label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                        <h3 className="text-base font-semibold text-[#111827]">Smart title generation</h3>
                      </div>
                      <Switch 
                        checked={templateEnabled}
                        onCheckedChange={handleToggleEnabled}
                      />
                    </div>
                    <p className="text-sm text-[#6B7280]">
                      Automate your titles to ensure consistency across all entries. AI will use your custom fields to generate clear, professional names automatically.
                    </p>
                  </div>

                  {templateEnabled && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      {isGeneratingSuggestions ? (
                        <div className="space-y-3">
                          <Skeleton className="h-[72px] w-full rounded-xl" />
                          <Skeleton className="h-[72px] w-full rounded-xl" />
                          <Skeleton className="h-[72px] w-full rounded-xl" />
                        </div>
                      ) : !showManualSetup ? (
                        <div className="space-y-4">
                          <RadioGroup 
                            value={selectedSuggestionIndex?.toString()} 
                            onValueChange={(val) => handleSelectSuggestion(parseInt(val))}
                            className="space-y-3"
                          >
                            {displayedSuggestions.map((suggestion, index) => (
                              <div key={index} className="relative group">
                                <label
                                  htmlFor={`suggestion-${index}`}
                                  className={cn(
                                    "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-[#2563EB]/50",
                                    selectedSuggestionIndex === index 
                                      ? "border-[#2563EB] bg-[#EFF6FF]" 
                                      : "border-[#E5E7EB] bg-white"
                                  )}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-3">
                                      <RadioGroupItem value={index.toString()} id={`suggestion-${index}`} className="sr-only" />
                                      <div className={cn(
                                        "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                                        selectedSuggestionIndex === index ? "border-[#2563EB] bg-[#2563EB]" : "border-[#D1D5DB] bg-white"
                                      )}>
                                        {selectedSuggestionIndex === index && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                      </div>
                                      <span className="font-medium text-[#111827]">
                                        {generatePreviewText(suggestion.template)}
                                      </span>
                                      {"id" in suggestion && (
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#F0FDF4] border border-[#DCFCE7]">
                                          <Sparkles className="w-2.5 h-2.5 text-[#16A34A]" />
                                          <span className="text-[10px] font-bold text-[#16A34A] uppercase tracking-tight">Library Match</span>
                                        </div>
                                      )}
                                    </div>
                                    {selectedSuggestionIndex === index && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-7 px-2 text-[#2563EB] hover:text-[#1D4ED8] hover:bg-[#DBEAFE] text-xs font-medium gap-1"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleEditSuggestion();
                                        }}
                                      >
                                        <Pencil className="w-3 h-3" />
                                        Edit
                                      </Button>
                                    )}
                                  </div>
                                  <p className="text-xs text-[#6B7280] ml-7">
                                    {suggestion.description}
                                  </p>
                                </label>
                              </div>
                            ))}
                          </RadioGroup>

                          <div className="flex items-center justify-between pt-2">
                            <button
                              onClick={generateNewOptions}
                              disabled={isGeneratingSuggestions}
                              className="flex items-center gap-2 text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
                            >
                              <RefreshCw className={cn("w-4 h-4", isGeneratingSuggestions && "animate-spin")} />
                              Generate new options
                            </button>
                            <button
                              onClick={handleCustomizeManually}
                              className="text-sm font-medium text-[#6B7280] hover:text-[#374151] transition-colors"
                            >
                              Customize manually
                            </button>
                          </div>

                          {/* Metadata view for selected suggestion */}
                          {selectedSuggestionIndex !== null && (
                            <div className="mt-4 p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg animate-in fade-in duration-500">
                              <div className="flex items-start gap-2">
                                <MessageSquare className="w-4 h-4 text-[#6B7280] mt-0.5" />
                                <div>
                                  <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">How it's built</p>
                                  <code className="text-xs text-[#374151] bg-[#F3F4F6] px-1.5 py-0.5 rounded border border-[#E5E7EB]">
                                    {displayedSuggestions[selectedSuggestionIndex].template}
                                  </code>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4 animate-in fade-in duration-300">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-[#111827]">Manual setup</h4>
                            <button 
                              onClick={() => setShowManualSetup(false)}
                              className="text-xs text-[#2563EB] hover:underline"
                            >
                              Back to suggestions
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div className="relative" ref={dropdownRef}>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-medium text-[#374151]">Template</label>
                                <button
                                  onClick={() => setShowVariableDropdown(!showVariableDropdown)}
                                  className="flex items-center gap-1 text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  Insert variable
                                </button>
                              </div>
                              
                              <div className="relative">
                                <input
                                  ref={templateInputRef}
                                  type="text"
                                  value={templateValue}
                                  onChange={handleTemplateInputChange}
                                  onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart || 0)}
                                  placeholder="e.g. {creator} - {field.project_name}"
                                  className={cn(
                                    "w-full bg-white px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all",
                                    templateErrors.length > 0 ? "border-[#EF4444]" : "border-[#D1D5DB]"
                                  )}
                                />
                                
                                {showVariableDropdown && (
                                  <div className="absolute left-0 top-full mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-50 max-h-[280px] overflow-y-auto">
                                    {Object.entries(variables).map(([group, vars]) => (
                                      <div key={group}>
                                        <div className="px-3 py-2 bg-[#F9FAFB] text-[10px] font-bold text-[#6B7280] uppercase tracking-wider border-y border-[#E5E7EB] first:border-t-0">
                                          {group}
                                        </div>
                                        <div className="py-1">
                                          {vars.map((v) => (
                                            <button
                                              key={v.name}
                                              onClick={() => insertVariable(v.name)}
                                              className="w-full px-3 py-2 text-left hover:bg-[#F3F4F6] flex flex-col gap-0.5 transition-colors"
                                            >
                                              <span className="text-sm font-medium text-[#111827]">{v.name}</span>
                                              <span className="text-[11px] text-[#6B7280]">Example: {v.example}</span>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {templateErrors.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {templateErrors.map((error, idx) => (
                                    <p key={idx} className="text-xs text-[#EF4444] flex items-center gap-1.5">
                                      <span className="w-1 h-1 rounded-full bg-[#EF4444]" />
                                      {error}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl shadow-sm">
                              <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">Live Preview</label>
                              <div className="text-sm font-medium text-[#1E293B]">
                                {previewText || <span className="text-[#94A3B8] italic">Start typing to see preview...</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {currentStep === 2 && (
                <div>
                  <h3 className="text-base font-semibold text-[#111827] mb-1">Select category capsules</h3>
                  <p className="text-sm text-[#6B7280] mb-6">Choose the information users must provide when creating new items in this category</p>
                  <p className="text-sm text-[#6B7280] mb-6">This section is under construction</p>
                </div>
              )}

              {currentStep === 3 && (
                <div>
                  <h3 className="text-base font-semibold text-[#111827] mb-1">Set up custom fields</h3>
                  <p className="text-sm text-[#6B7280] mb-6">Add custom fields to capture more context for items in this category</p>
                  <p className="text-sm text-[#6B7280] mb-6">This section is under construction</p>
                </div>
              )}

              {currentStep === 4 && (
                <div>
                  <h3 className="text-base font-semibold text-[#111827] mb-1">Select a workflow</h3>
                  <p className="text-sm text-[#6B7280] mb-6">Configure the approval workflow for items in this category</p>
                  <p className="text-sm text-[#6B7280] mb-6">This section is under construction</p>
                </div>
              )}


            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E7EB]">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="px-4 py-2 text-sm">
            Cancel
          </Button>
          <div className="flex gap-3">
            {!isFirstStep && (
              <Button variant="outline" onClick={goToPreviousStep} className="px-4 py-2 text-sm">
                Go back
              </Button>
            )}
            <Button 
              onClick={isLastStep ? handleCreate : goToNextStep} 
              className="px-4 py-2 text-sm bg-[#3B82F6] hover:bg-[#2563EB]"
              disabled={currentStep === 0 && !isEnhanced}
            >
              {isLastStep ? "Create" : "Continue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

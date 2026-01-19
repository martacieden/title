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

interface CategoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const steps = [
  { number: 1, label: "Category details", key: "details" },
  { number: 2, label: "Select category capsules", key: "capsules" },
  { number: 3, label: "Set up custom fields", key: "custom" },
  { number: 4, label: "Select a workflow", key: "workflow" },
]

const stepIndexMap: Record<string, number> = {
  details: 0,
  capsules: 1,
  custom: 2,
  workflow: 3,
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

  // Генерація нових опцій (перемішуємо масив)
  const generateNewOptions = () => {
    setIsGeneratingSuggestions(true)
    // Симуляція генерації (1-2 секунди)
    setTimeout(() => {
      const shuffled = [...aiSuggestions].sort(() => Math.random() - 0.5)
      setDisplayedSuggestions(shuffled.slice(0, 3))
      // Скидаємо вибір
      setSelectedSuggestionIndex(null)
      setIsGeneratingSuggestions(false)
    }, 1500)
  }

  // Обробка включення тоглу
  const handleToggleEnabled = () => {
    const newValue = !templateEnabled
    setTemplateEnabled(newValue)
    
    if (newValue) {
      // Спочатку скидаємо вибір
      setSelectedSuggestionIndex(null)
      setTemplateValue("")
      // Показуємо лоадер при включенні
      setIsGeneratingSuggestions(true)
      setTimeout(() => {
        setIsGeneratingSuggestions(false)
        // Smart defaults: автоматично вибираємо найкращу опцію (першу)
        if (displayedSuggestions.length > 0) {
          setSelectedSuggestionIndex(0)
          const selectedTemplate = displayedSuggestions[0].template
          setTemplateValue(selectedTemplate)
          const errors = validateTemplate(selectedTemplate)
          setTemplateErrors(errors)
        }
      }, 1500)
    } else {
      // При вимкненні скидаємо вибір
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
                <div>
                  <h3 className="text-base font-semibold text-[#111827] mb-1">Select category capsules</h3>
                  <p className="text-sm text-[#6B7280] mb-6">Choose the information users must provide when creating new items in this category</p>
                  <p className="text-sm text-[#6B7280] mb-6">This section is under construction</p>
                </div>
              )}

              {currentStep === 2 && (
                <div>
                  <h3 className="text-base font-semibold text-[#111827] mb-1">Set up custom fields</h3>
                  <p className="text-sm text-[#6B7280] mb-6">Add custom fields to capture more context for items in this category</p>
                  <p className="text-sm text-[#6B7280] mb-6">This section is under construction</p>
                </div>
              )}

              {currentStep === 3 && (
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

export interface TitleTemplate {
  id: string
  category: string
  template: string
  description: string
  example: string
  fields: string[]
}

export const templateLibrary: TitleTemplate[] = [
  // HR
  {
    id: "hr-vacation",
    category: "Vacation Requests",
    template: "{creator} vacation request ({field.start} - {field.end})",
    description: "Standard format for time off tracking",
    example: "John Doe vacation request (Dec 15 - Dec 20)",
    fields: ["{creator}", "{field.start}", "{field.end}"]
  },
  {
    id: "hr-onboarding",
    category: "Onboarding",
    template: "Onboarding: {field.employee_name} - {created_date}",
    description: "Track new hire progress",
    example: "Onboarding: Alice Smith - 01/20/2024",
    fields: ["{field.employee_name}", "{created_date}"]
  },
  // Maintenance
  {
    id: "maint-work-order",
    category: "Maintenance",
    template: "Work Order #{field.order_id}: {field.issue_type} - {field.location}",
    description: "Detailed work order for repairs",
    example: "Work Order #1234: Plumbing - Building A",
    fields: ["{field.order_id}", "{field.issue_type}", "{field.location}"]
  },
  // Invoices
  {
    id: "inv-vendor",
    category: "Invoices",
    template: "Invoice: {field.vendor} - {field.amount} (Due: {due_date})",
    description: "Vendor payment tracking",
    example: "Invoice: Amazon - $450.00 (Due: 03/15/2024)",
    fields: ["{field.vendor}", "{field.amount}", "{due_date}"]
  },
  // Family Office
  {
    id: "fo-investment",
    category: "Investment Decisions",
    template: "Investment: {field.asset_name} - {field.strategy} ({created_date})",
    description: "Track financial decisions",
    example: "Investment: Apple Stock - Growth (01/20/2024)",
    fields: ["{field.asset_name}", "{field.strategy}", "{created_date}"]
  }
]

export const getTemplatesByCategory = (categoryName: string): TitleTemplate[] => {
  const normalizedSearch = categoryName.toLowerCase()
  return templateLibrary.filter(t => 
    t.category.toLowerCase().includes(normalizedSearch) || 
    normalizedSearch.includes(t.category.toLowerCase())
  )
}

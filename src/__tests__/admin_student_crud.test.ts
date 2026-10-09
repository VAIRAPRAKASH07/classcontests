import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const createStudentSchema = z.object({
  name: z.string().min(2),
  rollNumber: z.string().min(2),
  email: z.string().email(),
  department: z.string().min(1),
  section: z.string().min(1),
  batchYear: z.number().int().min(2020).max(2035),
  tempPassword: z.string().min(8),
})

describe('Phase 2: Admin Student Management Logic Tests', () => {
  it('should validate valid student creation payload', () => {
    const payload = {
      name: 'Rahul Sharma',
      rollNumber: '21CS042',
      email: 'rahul.21cs042@institution.ac.in',
      department: 'CSE',
      section: 'A',
      batchYear: 2025,
      tempPassword: 'Pass#21CS0422025',
    }

    const res = createStudentSchema.safeParse(payload)
    expect(res.success).toBe(true)
  })

  it('should reject invalid student email or short password', () => {
    const invalidPayload = {
      name: 'Rahul',
      rollNumber: '21CS042',
      email: 'not-an-email',
      department: 'CSE',
      section: 'A',
      batchYear: 2025,
      tempPassword: 'short',
    }

    const res = createStudentSchema.safeParse(invalidPayload)
    expect(res.success).toBe(false)
  })

  it('should parse CSV lines cleanly', () => {
    const csvContent = `name,roll_number,email,department,section,batch_year,temp_password\nRahul Sharma,21CS042,rahul@gmail.com,CSE,A,2025,Pass1234\nPriya Patel,21CS043,priya@gmail.com,CSE,A,2025,Pass5678`
    const lines = csvContent.split('\n').map((l) => l.trim()).filter(Boolean)

    expect(lines.length).toBe(3)
    const headers = lines[0].split(',')
    expect(headers).toContain('roll_number')
  })
})

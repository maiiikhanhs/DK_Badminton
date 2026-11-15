import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('giữ eyebrow trước tiêu đề theo mặc định', () => {
    render(
      <MemoryRouter>
        <PageHeader eyebrow="Dòng phụ" title="Tiêu đề" />
      </MemoryRouter>,
    )

    const eyebrow = screen.getByText('Dòng phụ')
    expect(eyebrow.nextElementSibling).toBe(screen.getByRole('heading', { name: 'Tiêu đề' }))
  })
})

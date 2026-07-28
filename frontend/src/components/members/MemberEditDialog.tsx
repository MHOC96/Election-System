import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { FormField } from '@/components/design-system/FormField'
import { restoreBodyPointerEvents } from '@/lib/pointer-events'
import { memberEditSchema, type MemberEditForm } from '@/lib/form-schemas'
import type { Member } from '@/types/api'

interface MemberEditDialogProps {
  member: Member | null
  open: boolean
  isSaving: boolean
  onClose: () => void
  onSave: (values: MemberEditForm) => void
}

export function MemberEditDialog({
  member,
  open,
  isSaving,
  onClose,
  onSave,
}: MemberEditDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm<MemberEditForm>({
    resolver: zodResolver(memberEditSchema),
    defaultValues: { cpm_number: '', is_active: true },
    mode: 'onBlur',
  })

  const cpmNumber = watch('cpm_number')
  const isActive = watch('is_active')

  useEffect(() => {
    if (!member) return
    reset({
      cpm_number: member.cpm_number,
      is_active: member.is_active,
    })
  }, [member, reset])

  const handleClose = () => {
    onClose()
    reset({ cpm_number: '', is_active: true })
    requestAnimationFrame(() => restoreBodyPointerEvents())
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit member</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(onSave)(e)} className="space-y-4" noValidate>
          <FormField
            label="CPM Number"
            htmlFor="cpm_number"
            error={errors.cpm_number?.message}
            valid={Boolean(touchedFields.cpm_number && cpmNumber && !errors.cpm_number)}
            required
          >
            <Input
              id="cpm_number"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              {...register('cpm_number')}
            />
          </FormField>
          <FormField label="Status" htmlFor="member_status" hint="Inactive members cannot sign in or vote.">
            <NativeSelect
              id="member_status"
              value={isActive ? 'active' : 'inactive'}
              onChange={(e) =>
                setValue('is_active', e.target.value === 'active', { shouldValidate: true })
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </NativeSelect>
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isSaving}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

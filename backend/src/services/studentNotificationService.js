
import { supabase } from '../config/supabase.js'

const ALLOWED_NOTIFICATION_TYPES = [
  'general',
  'enrollment',
  'academic',
  'result',
  'system',
  'security',
]

export async function getStudentNotifications(
  profileId,
  notificationType = ''
) {
  let query = supabase
    .from('notifications')
    .select(`
      id,
      title,
      message,
      notification_type,
      is_read,
      created_at,
      read_at
    `)
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (notificationType) {
    if (!ALLOWED_NOTIFICATION_TYPES.includes(notificationType)) {
      const error = new Error('Invalid notification category.')
      error.statusCode = 400
      throw error
    }

    query = query.eq('notification_type', notificationType)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function getStudentUnreadCount(profileId) {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('is_read', false)

  if (error) {
    throw new Error(error.message)
  }

  return count || 0
}

export async function markStudentNotificationAsRead(
  profileId,
  notificationId
) {
  const { data, error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .eq('profile_id', profileId)
    .eq('is_read', false)
    .select('id, is_read, read_at')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (data) {
    return data
  }

  // Check whether the notification already exists and belongs to this student.
  const { data: existing, error: lookupError } = await supabase
    .from('notifications')
    .select('id, is_read, read_at')
    .eq('id', notificationId)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (lookupError) {
    throw new Error(lookupError.message)
  }

  if (!existing) {
    const notFoundError = new Error('Notification not found.')
    notFoundError.statusCode = 404
    throw notFoundError
  }

  return existing
}

export async function markAllStudentNotificationsAsRead(profileId) {
  const { data, error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('profile_id', profileId)
    .eq('is_read', false)
    .select('id')

  if (error) {
    throw new Error(error.message)
  }

  return {
    updatedCount: data?.length || 0,
  }
}

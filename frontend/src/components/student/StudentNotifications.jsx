
import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  GraduationCap,
  Megaphone,
  ShieldCheck,
  Info,
  RefreshCw,
} from 'lucide-react'

import api from '../../services/api'
import './StudentNotifications.css'

const categories = [
  { value: 'all', label: 'All categories' },
  { value: 'general', label: 'Announcements' },
  { value: 'enrollment', label: 'Enrollment' },
  { value: 'academic', label: 'Academic' },
  { value: 'result', label: 'Results' },
  { value: 'system', label: 'System' },
  { value: 'security', label: 'Account & Security' },
]

const categoryDetails = {
  general: { label: 'Announcement', icon: Megaphone },
  enrollment: { label: 'Enrollment', icon: GraduationCap },
  academic: { label: 'Academic', icon: GraduationCap },
  result: { label: 'Result', icon: GraduationCap },
  system: { label: 'System', icon: Info },
  security: { label: 'Security', icon: ShieldCheck },
}

function formatDate(value) {
  if (!value) return ''

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')

  async function loadNotifications() {
    try {
      setLoading(true)
      setError('')

      const [notificationResponse, countResponse] = await Promise.all([
        api.get('/student/notifications'),
        api.get('/student/notifications/unread-count'),
      ])

      setNotifications(
        notificationResponse.data.data.notifications || []
      )

      setUnreadCount(
        countResponse.data.data.unreadCount || 0
      )
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        'Unable to load notifications. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      const matchesTab =
        activeTab === 'all' || !notification.is_read

      const matchesCategory =
        selectedCategory === 'all' ||
        notification.notification_type === selectedCategory

      return matchesTab && matchesCategory
    })
  }, [notifications, activeTab, selectedCategory])

  async function handleMarkAsRead(notification) {
    if (notification.is_read) {
      setSelectedNotification(notification)
      return
    }

    try {
      setUpdating(true)

      await api.patch(
        `/student/notifications/${notification.id}/read`
      )

      setNotifications(current =>
        current.map(item =>
          item.id === notification.id
            ? { ...item, is_read: true, read_at: new Date().toISOString() }
            : item
        )
      )

      setUnreadCount(current => Math.max(0, current - 1))

      setSelectedNotification({
        ...notification,
        is_read: true,
        read_at: new Date().toISOString(),
      })
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        'Unable to update this notification.'
      )
    } finally {
      setUpdating(false)
    }
  }

  async function handleMarkAllAsRead() {
    if (unreadCount === 0) return

    try {
      setUpdating(true)
      setError('')

      await api.patch('/student/notifications/read-all')

      setNotifications(current =>
        current.map(notification => ({
          ...notification,
          is_read: true,
          read_at: notification.read_at || new Date().toISOString(),
        }))
      )

      setUnreadCount(0)

      if (selectedNotification) {
        setSelectedNotification(current => ({
          ...current,
          is_read: true,
          read_at: current.read_at || new Date().toISOString(),
        }))
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        'Unable to mark all notifications as read.'
      )
    } finally {
      setUpdating(false)
    }
  }

  function getCategoryDetails(type) {
    return categoryDetails[type] || {
      label: 'Notification',
      icon: Bell,
    }
  }

  return (
    <div className="student-notifications">
      <div className="student-notifications-header">
        <div>
          <span className="student-notifications-eyebrow">
            STUDENT PORTAL
          </span>
          <h1>Notifications</h1>
          <p>
            Stay updated with important announcements and academic
            information.
          </p>
        </div>

        <div className="student-notifications-header-icon">
          <Bell size={25} />
          {unreadCount > 0 && (
            <span>{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </div>
      </div>

      <div className="student-notifications-summary">
        <div className="student-notifications-summary-icon">
          <Bell size={21} />
        </div>
        <div>
          <strong>{unreadCount} unread notifications</strong>
          <p>
            {notifications.length} total notifications in your inbox
          </p>
        </div>

        <button
          type="button"
          className="student-notifications-refresh"
          onClick={loadNotifications}
          disabled={loading || updating}
          title="Refresh notifications"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="student-notifications-error" role="alert">
          {error}
        </div>
      )}

      <div className="student-notifications-toolbar">
        <div className="student-notifications-tabs">
          <button
            type="button"
            className={activeTab === 'all' ? 'active' : ''}
            onClick={() => setActiveTab('all')}
          >
            All
            <span>{notifications.length}</span>
          </button>

          <button
            type="button"
            className={activeTab === 'unread' ? 'active' : ''}
            onClick={() => setActiveTab('unread')}
          >
            Unread
            <span>{unreadCount}</span>
          </button>
        </div>

        <div className="student-notifications-actions">
          <select
            value={selectedCategory}
            onChange={event => setSelectedCategory(event.target.value)}
            aria-label="Filter notifications by category"
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="student-notifications-mark-all"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || updating}
          >
            <CheckCheck size={16} />
            Mark all as read
          </button>
        </div>
      </div>

      <div className="student-notifications-content">
        <div className="student-notifications-list">
          {loading ? (
            <div className="student-notifications-empty">
              <RefreshCw size={24} className="notification-spinner" />
              <p>Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="student-notifications-empty">
              <Bell size={32} />
              <h3>No notifications found</h3>
              <p>
                {activeTab === 'unread'
                  ? 'You are all caught up. There are no unread notifications.'
                  : 'There are no notifications in this category yet.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map(notification => {
              const category = getCategoryDetails(
                notification.notification_type
              )
              const CategoryIcon = category.icon

              return (
                <button
                  type="button"
                  key={notification.id}
                  className={`student-notification-item ${
                    notification.is_read ? 'read' : 'unread'
                  } ${
                    selectedNotification?.id === notification.id
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() => handleMarkAsRead(notification)}
                  disabled={updating}
                >
                  <div className="student-notification-item-icon">
                    <CategoryIcon size={20} />
                  </div>

                  <div className="student-notification-item-body">
                    <div className="student-notification-item-top">
                      <span className="student-notification-category">
                        {category.label}
                      </span>
                      {!notification.is_read && (
                        <span className="student-notification-unread-dot" />
                      )}
                    </div>

                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>

                    <span className="student-notification-date">
                      <Clock size={13} />
                      {formatDate(notification.created_at)}
                    </span>
                  </div>

                  {notification.is_read && (
                    <Check
                      size={17}
                      className="student-notification-read-icon"
                    />
                  )}
                </button>
              )
            })
          )}
        </div>

        <aside className="student-notification-detail">
          {selectedNotification ? (
            <>
              <span className="student-notification-detail-label">
                NOTIFICATION DETAILS
              </span>
              <h3>{selectedNotification.title}</h3>
              <p>{selectedNotification.message}</p>

              <div className="student-notification-detail-meta">
                <span>Category</span>
                <strong>
                  {getCategoryDetails(
                    selectedNotification.notification_type
                  ).label}
                </strong>
              </div>

              <div className="student-notification-detail-meta">
                <span>Received</span>
                <strong>
                  {formatDate(selectedNotification.created_at)}
                </strong>
              </div>

              <div className="student-notification-detail-status">
                <CheckCheck size={16} />
                {selectedNotification.is_read
                  ? 'Read'
                  : 'Unread'}
              </div>
            </>
          ) : (
            <div className="student-notification-detail-empty">
              <Bell size={27} />
              <h3>Notification details</h3>
              <p>
                Select a notification to view its complete details.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

import Notification from '../models/Notification.js';

class NotificationService {
  /**
   * Add notification to background queue.
   */
  async send(payload, userIds = [], role = null, session = null) {
    try {
      const { notificationQueue } = await import('./QueueService.js');
      // session cannot be serialized to redis, omit it for async processing
      await notificationQueue.add('sendNotification', { payload, userIds, role });
    } catch (e) {
      // Fallback to direct send if queue fails or redis is unavailable
      await this.sendDirect(payload, userIds, role, session);
    }
  }

  /**
   * Directly send notification (called by Worker).
   */
  async sendDirect(payload, userIds = [], role = null, session = null) {
    const {
      title,
      message,
      type,
      priority = 'MEDIUM',
      module,
      documentId,
      metadata,
      sender = null
    } = payload;

    const notifications = [];

    // If direct users specified
    if (userIds && userIds.length > 0) {
      userIds.forEach(userId => {
        notifications.push({
          recipient: userId,
          sender,
          title,
          message,
          msg: message, // backwards compatibility
          type,
          priority,
          module,
          documentId,
          metadata,
          date: new Date().toISOString().slice(0, 10)
        });
      });
    }

    // If role broadcast specified
    if (role && (!userIds || userIds.length === 0)) {
      notifications.push({
        recipient: null,
        role,
        sender,
        title,
        message,
        msg: message, // backwards compatibility
        type,
        priority,
        module,
        documentId,
        metadata,
        date: new Date().toISOString().slice(0, 10)
      });
    }

    if (notifications.length > 0) {
      const opts = session ? { session } : {};
      const savedDocs = await Notification.insertMany(notifications, opts);
      
      // Emit socket events
      try {
        const { getIO } = await import('../utils/socket.js');
        const io = getIO();
        
        savedDocs.forEach(doc => {
          if (doc.recipient) {
            io.to(`user_${doc.recipient}`).emit('notification', doc);
          } else if (doc.role) {
            io.to(`role_${doc.role}`).emit('notification', doc);
          }
        });
      } catch (err) {
        // socket not initialized or other error, ignore so DB transaction doesn't fail
        console.error('Socket emit failed in NotificationService:', err.message);
      }
    }
  }
}

export default new NotificationService();

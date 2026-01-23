/**
 * In-memory task tracking for Nano Banana image generation
 * Maps taskId -> { chatId, timestamp }
 */

const taskMap = new Map();
const TASK_EXPIRY_TIME = 60 * 60 * 1000; // 1 hour

/**
 * Store a task ID with associated chat ID
 * @param {string} taskId - Nano Banana task ID
 * @param {number} chatId - Telegram chat ID
 */
export function storeTask(taskId, chatId) {
  taskMap.set(taskId, {
    chatId,
    timestamp: Date.now(),
  });
}

/**
 * Retrieve task info by task ID
 * @param {string} taskId - Nano Banana task ID
 * @returns {object|null} Task info or null if not found/expired
 */
export function getTask(taskId) {
  const task = taskMap.get(taskId);
  if (!task) return null;

  // Check if expired
  if (Date.now() - task.timestamp > TASK_EXPIRY_TIME) {
    taskMap.delete(taskId);
    return null;
  }

  return task;
}

/**
 * Remove a task from tracking
 * @param {string} taskId - Nano Banana task ID
 */
export function removeTask(taskId) {
  taskMap.delete(taskId);
}

/**
 * Clean up expired tasks (run periodically)
 */
export function cleanupExpiredTasks() {
  const now = Date.now();
  for (const [taskId, task] of taskMap.entries()) {
    if (now - task.timestamp > TASK_EXPIRY_TIME) {
      taskMap.delete(taskId);
    }
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupExpiredTasks, 30 * 60 * 1000);

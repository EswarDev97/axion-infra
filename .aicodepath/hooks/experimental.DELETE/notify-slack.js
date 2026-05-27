#!/usr/bin/env node

/**
 * Notification Hook - Slack Integration
 *
 * Sends notifications to Slack when certain events occur.
 * Runs asynchronously to avoid blocking Claude.
 *
 * Event: Notification
 * Matchers: permission_prompt, idle_prompt, auth_success, elicitation_dialog
 *
 * Date: 2026-02-03
 * Version: 1.0.0
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * Notification types and their default settings
 */
const NOTIFICATION_SETTINGS = {
  permission_prompt: {
    enabled: true,
    priority: 'medium',
    channel: '#aicodepath-notifications'
  },
  idle_prompt: {
    enabled: false,
    priority: 'low',
    channel: '#aicodepath-activity'
  },
  auth_success: {
    enabled: true,
    priority: 'high',
    channel: '#aicodepath-security'
  },
  elicitation_dialog: {
    enabled: true,
    priority: 'medium',
    channel: '#aicodepath-notifications'
  }
};

/**
 * Notification hook handler
 */
async function hook(hookInput) {
  const { arguments: args = {}, matcher = 'other' } = hookInput;
  const notificationType = matcher;

  console.log(`\n[Notification] ${notificationType} event`);

  try {
    // Get notification settings
    const settings = loadNotificationSettings();
    const typeSettings = NOTIFICATION_SETTINGS[notificationType] || {};

    // Check if this notification type is enabled
    if (!typeSettings.enabled || !settings.enabled) {
      console.log('   ℹ️  Notifications disabled');
      return {
        hookSpecificOutput: {
          hookEventName: 'Notification',
          additionalContext: 'Notifications disabled'
        }
      };
    }

    // Check if webhook URL is configured
    if (!settings.slackWebhookUrl) {
      console.log('   ⚠️  Slack webhook not configured');
      return {
        hookSpecificOutput: {
          hookEventName: 'Notification',
          additionalContext: 'Slack webhook not configured'
        }
      };
    }

    // Build notification message
    const message = buildNotificationMessage(notificationType, args);

    // Send to Slack
    console.log(`   📤 Sending to Slack: ${typeSettings.channel}`);
    await sendSlackNotification(settings.slackWebhookUrl, message);

    console.log(`✅ Notification sent`);

    return {
      hookSpecificOutput: {
        hookEventName: 'Notification',
        additionalContext: `Notification sent to ${typeSettings.channel}`
      }
    };

  } catch (error) {
    console.error(`⚠️  Notification error: ${error.message}`);

    // Don't block on notification failure
    return {
      hookSpecificOutput: {
        hookEventName: 'Notification',
        additionalContext: `Notification failed: ${error.message}`
      }
    };
  }
}

/**
 * Load notification settings from config
 */
function loadNotificationSettings() {
  const configPath = path.join(process.cwd(), '.aicodepath', 'config.json');

  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.notifications || { enabled: false };
    } catch (error) {
      console.warn(`   ⚠️  Failed to load config: ${error.message}`);
    }
  }

  // Check environment variable
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  return {
    enabled: !!webhookUrl,
    slackWebhookUrl: webhookUrl
  };
}

/**
 * Build Slack notification message
 */
function buildNotificationMessage(type, args) {
  const timestamp = new Date().toISOString();
  const projectName = process.env.PROJECT_NAME || 'AICodePath';

  let color = '#36a64f'; // green
  let title = type;
  let text = '';

  switch (type) {
    case 'permission_prompt':
      color = '#ff9900'; // orange
      title = '🔐 Permission Required';
      text = `Claude is requesting permission for an operation in ${projectName}.`;
      break;

    case 'idle_prompt':
      color = '#cccccc'; // gray
      title = '💤 Session Idle';
      text = `Claude Code session has been idle in ${projectName}.`;
      break;

    case 'auth_success':
      color = '#36a64f'; // green
      title = '✅ Authentication Successful';
      text = `User authenticated successfully for ${projectName}.`;
      break;

    case 'elicitation_dialog':
      color = '#3AA3E3'; // blue
      title = '❓ User Input Needed';
      text = `Claude needs user input for ${projectName}.`;
      break;

    default:
      text = `Notification from ${projectName}: ${type}`;
  }

  // Add details if provided
  if (args.message) {
    text += `\n\n${args.message}`;
  }

  return {
    attachments: [
      {
        fallback: `${title}: ${text}`,
        color,
        title,
        text,
        footer: 'AICodePath',
        ts: Math.floor(Date.now() / 1000)
      }
    ]
  };
}

/**
 * Send notification to Slack webhook
 */
function sendSlackNotification(webhookUrl, message) {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);

    const data = JSON.stringify(message);

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(responseData);
        } else {
          reject(new Error(`Slack API error: ${res.statusCode} ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

module.exports = { hook };

// CLI support
if (require.main === module) {
  const testInput = {
    arguments: {
      message: 'Testing notification system'
    },
    matcher: 'permission_prompt'
  };

  hook(testInput)
    .then(result => {
      console.log('\nHook Result:');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error('Hook failed:', error);
      process.exit(1);
    });
}

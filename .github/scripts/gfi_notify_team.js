// Script to notify the team when a GFI issue is labeled.

const marker = '<!-- GFI Issue Notification -->';
const TEAM_ALIAS = '@hiero-ledger/hiero-sdk-good-first-issue-support';

async function notifyTeam(github, owner, repo, issue, message, marker) {
  const comment = `${marker} :wave: Hello Team :wave:
${TEAM_ALIAS}

${message}

Repository: ${owner}/${repo} : Issue: #${issue.number} - ${issue.title || '(no title)'}

Best Regards,
Python SDK team`;

  try {
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: issue.number,
      body: comment,
    });
    console.log(`Notified team about GFI issue #${issue.number}`);
    return true;
  } catch (commentErr) {
    console.log(`Failed to notify team about GFI issue #${issue.number}:`, commentErr.message || commentErr);
    return false;
  }
}

module.exports = async ({ github, context }) => {
  try {
    const { owner, repo } = context.repo;
    const { issue, comment } = context.payload;

    if (!issue?.number) return console.log('No issue in payload');
    
    if (comment?.user?.type === 'Bot' || comment?.user?.login === 'github-actions') {
      return console.log('Ignoring bot comment');
    }

    if (!comment?.user?.login) {
      return console.log('No valid comment user found');
    }
    const labels = issue.labels?.map(l => l.name) || [];

    const isGFI =
      labels.includes('Good First Issue') ||
      labels.includes('Good First Issue Candidate');

    if (!isGFI) {
      return console.log('Issue is not a GFI');
    }

    if (issue.assignees && issue.assignees.length > 0) {
      return console.log('Issue already assigned');
    }
    
    // Fetching all comments before checking human comments
    const comments = await github.paginate(github.rest.issues.listComments, {
      owner, repo, issue_number: issue.number, per_page: 100
    });
    
    const humanComments = comments.filter(c => c.user?.type !== 'Bot' && !c.author_association?.includes('MEMBER'));

    if (humanComments.length > 1) {
      return console.log('Not first human comment, skipping notification');
    }

    // Check if notification already exists
    if (comments.some(c => c.body?.includes(marker))) {
      return console.log(`Notification already exists for #${issue.number}`);
    }

    const message = labels.includes('Good First Issue')
      ? `@${comment.user.login} commented on this Good First Issue and may be ready to be assigned. Please review and assign if appropriate.`
      : `@${comment.user.login} commented on this Good First Issue Candidate. Please review and determine if it should be promoted and assigned.`;


    // Post notification
    const success = await notifyTeam(github, owner, repo, issue, message, marker);

    if (success) {
      console.log('=== Summary ===');
      console.log(`Repository: ${owner}/${repo}`);
      console.log(`Issue Number: ${issue.number}`);
      console.log(`Message: ${message}`);
    }

  } catch (err) {
    console.log('❌ Error:', err.message);
  }
};
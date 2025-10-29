import { paginatedFetch, getNodes } from '../utils/graphql-client.js';

export async function fetchDiscussions(repo) {
  let totalUpvotes = 0;
  let totalComments = 0;
  const positiveReactions = ["THUMBS_UP", "HEART", "HOORAY", "ROCKET"];

  await paginatedFetch('discussions', (data) => {
    const discussions = getNodes(data, 'discussions');

    discussions.forEach((discussion) => {
      totalComments += discussion.comments.totalCount;

      discussion.reactions.nodes.forEach((reaction) => {
        if (positiveReactions.includes(reaction.content)) {
          totalUpvotes++;
        }
      });
    });
  }, repo);

  return { totalUpvotes, totalComments };
}

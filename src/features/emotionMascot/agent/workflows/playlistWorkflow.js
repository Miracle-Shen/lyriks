export const runPlaylistWorkflow = ({ input, memory, subAgents }) => {
  const result = subAgents.music.run('playlist', input);

  memory.appendEvent({
    payload: {
      playlistTitle: result.playlistTitle,
    },
    type: 'playlist.created',
  });

  return result;
};


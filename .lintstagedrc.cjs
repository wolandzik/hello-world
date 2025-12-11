const path = require('path');

const removeWorkspacePrefix = (workspace, files) =>
  files
    .map((file) => path.relative(process.cwd(), file))
    .filter((file) => file.startsWith(`${workspace}/`))
    .map((file) => file.replace(`${workspace}/`, ''));

module.exports = {
  '*.{js,jsx,ts,tsx,json,md,css,scss}': ['prettier --write'],
  '**/*.{ts,tsx,js,jsx}': (files) => {
    const backendFiles = removeWorkspacePrefix('backend', files);
    const frontendFiles = removeWorkspacePrefix('frontend', files);
    const commands = [];

    if (backendFiles.length) {
      commands.push(`npm --prefix backend run lint -- --fix ${backendFiles.join(' ')}`);
    }

    if (frontendFiles.length) {
      commands.push('npm --prefix frontend run lint -- --fix');
    }

    return commands;
  },
};

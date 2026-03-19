export interface BundleSkill {
  source: string;
  skillId: string;
  hasContentFetchError?: boolean;
}

export interface InstallCommand {
  source: string;
  skills: string[];
  command: string;
  hasWarning: boolean;
}

export function generateInstallCommands(
  skills: BundleSkill[],
): InstallCommand[] {
  const grouped = new Map<string, { skillIds: string[]; hasWarning: boolean }>();

  for (const skill of skills) {
    const existing = grouped.get(skill.source) ?? { skillIds: [], hasWarning: false };
    existing.skillIds.push(skill.skillId);
    if (skill.hasContentFetchError) existing.hasWarning = true;
    grouped.set(skill.source, existing);
  }

  return Array.from(grouped.entries()).map(([source, { skillIds, hasWarning }]) => {
    const skillFlags = skillIds.map((id) => `--skill ${id}`).join(" ");
    return {
      source,
      skills: skillIds,
      command: `npx skills add ${source} ${skillFlags}`,
      hasWarning,
    };
  });
}

export function generateAllCommandsText(skills: BundleSkill[]): string {
  return generateInstallCommands(skills)
    .map((cmd) => cmd.command)
    .join(" && ");
}

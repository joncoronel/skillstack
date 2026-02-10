export interface BundleSkill {
  source: string;
  skillId: string;
}

export interface InstallCommand {
  source: string;
  skills: string[];
  command: string;
}

export function generateInstallCommands(
  skills: BundleSkill[],
): InstallCommand[] {
  const grouped = new Map<string, string[]>();

  for (const skill of skills) {
    const existing = grouped.get(skill.source) ?? [];
    existing.push(skill.skillId);
    grouped.set(skill.source, existing);
  }

  return Array.from(grouped.entries()).map(([source, skillIds]) => {
    const skillFlags = skillIds.map((id) => `--skill ${id}`).join(" ");
    return {
      source,
      skills: skillIds,
      command: `npx skills add ${source} ${skillFlags}`,
    };
  });
}

export function generateAllCommandsText(skills: BundleSkill[]): string {
  return generateInstallCommands(skills)
    .map((cmd) => cmd.command)
    .join(" && ");
}

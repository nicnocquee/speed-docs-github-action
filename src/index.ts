#!/usr/bin/env node

import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as github from "@actions/github";
import path from "path";
import fs from "fs";

interface ActionInputs {
  contentPath: string;
  githubToken: string;
  outputDir?: string;
  templateUrl?: string;
  force?: boolean;
  downloadDir?: string;
  basePath?: string;
}

async function validateGitHubToken(githubToken: string): Promise<void> {
  try {
    core.info("🔐 Validating GitHub token permissions...");

    // Test token by making a simple API call
    const octokit = github.getOctokit(githubToken);
    const { owner, repo } = github.context.repo;

    // Check if we can access the repository
    await octokit.rest.repos.get({ owner, repo });
    core.info("✅ GitHub token validation successful");
  } catch (error) {
    throw new Error(
      `GitHub token validation failed. Please ensure the token has 'repo' permissions: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

async function run(): Promise<void> {
  try {
    // Get inputs
    const inputs: ActionInputs = {
      contentPath: core.getInput("content-path", { required: true }),
      githubToken: core.getInput("github-token", { required: true }),
      outputDir: core.getInput("output-dir") || "docs-output",
      templateUrl: core.getInput("template-url"),
      force: core.getBooleanInput("force"),
      downloadDir: core.getInput("download-dir"),
      basePath: core.getInput("base-path"),
    };

    core.info("🚀 Starting Speed Docs GitHub Action");
    core.info(`📁 Content path: ${inputs.contentPath}`);
    core.info(`📁 Output directory: ${inputs.outputDir}`);

    // Validate GitHub token permissions
    await validateGitHubToken(inputs.githubToken);

    // Validate content path exists
    const resolvedContentPath = path.resolve(inputs.contentPath);
    if (!fs.existsSync(resolvedContentPath)) {
      throw new Error(`Content path does not exist: ${resolvedContentPath}`);
    }

    // Check if config.json exists in content path
    const configPath = path.join(resolvedContentPath, "config.json");
    if (!fs.existsSync(configPath)) {
      throw new Error(
        `config.json not found in content path: ${resolvedContentPath}`
      );
    }

    // Build speed-docs command
    const speedDocsCommand = ["speed-docs", resolvedContentPath];

    if (inputs.templateUrl) {
      speedDocsCommand.push("--template", inputs.templateUrl);
    }

    if (inputs.force) {
      speedDocsCommand.push("--force");
    }

    if (inputs.downloadDir) {
      speedDocsCommand.push("--download-dir", inputs.downloadDir);
    }

    if (inputs.basePath) {
      speedDocsCommand.push("--base-path", inputs.basePath);
    }

    core.info(`🔨 Running speed-docs command: ${speedDocsCommand.join(" ")}`);

    // Run speed-docs CLI
    const { stdout, stderr, exitCode } = await exec.getExecOutput(
      "npx",
      speedDocsCommand,
      {
        cwd: process.cwd(),
      }
    );

    if (exitCode !== 0) {
      const errorMessage =
        stderr.trim() || stdout.trim() || `Exit code ${exitCode}`;
      throw new Error(`speed-docs command failed: ${errorMessage}`);
    }

    core.info("✅ Speed docs build completed successfully");
    if (stdout.trim()) {
      core.info(`Speed-docs output: ${stdout.trim()}`);
    }

    // Verify output directory exists
    const outputPath = path.resolve(inputs.outputDir!);
    if (!fs.existsSync(outputPath)) {
      throw new Error(
        `Speed-docs failed to create output directory: ${outputPath}`
      );
    }

    core.info(`📁 Output directory verified: ${outputPath}`);

    // Deploy to GitHub Pages
    await deployToGitHubPages(outputPath, inputs.githubToken);

    core.info("🎉 GitHub Action completed successfully!");
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

async function deployToGitHubPages(
  outputPath: string,
  githubToken: string
): Promise<void> {
  try {
    core.info("🚀 Deploying to GitHub Pages...");

    // Configure git
    await exec.exec("git", [
      "config",
      "--global",
      "user.name",
      "github-actions[bot]",
    ]);
    await exec.exec("git", [
      "config",
      "--global",
      "user.email",
      "github-actions[bot]@users.noreply.github.com",
    ]);

    // Get repository information
    const { owner, repo } = github.context.repo;
    const repositoryUrl = `https://github.com/${owner}/${repo}.git`;
    const authenticatedUrl = `https://x-access-token:${githubToken}@github.com/${owner}/${repo}.git`;

    core.info(`📦 Repository: ${owner}/${repo}`);

    // Create a temporary directory for the deployment
    const tempDir = fs.mkdtempSync(path.join(process.cwd(), "deploy-"));

    try {
      // Clone the repository into a subdirectory
      core.info("📥 Cloning repository...");
      const repoDir = path.join(tempDir, "repo");
      await exec.exec("git", [
        "clone",
        "--depth=1",
        "--no-single-branch",
        repositoryUrl,
        repoDir,
      ]);

      // Set up authentication for the cloned repository
      await exec.exec(
        "git",
        ["remote", "set-url", "origin", authenticatedUrl],
        {
          cwd: repoDir,
        }
      );

      // Fetch all branches to ensure we have the latest refs
      core.info("📥 Fetching all branches...");
      await exec.exec("git", ["fetch", "origin"], { cwd: repoDir });

      // Switch to gh-pages branch or create it
      try {
        // Try to checkout existing gh-pages branch
        await exec.exec("git", ["checkout", "gh-pages"], {
          cwd: repoDir,
        });
        core.info("📋 Switched to existing gh-pages branch");

        // Pull latest changes from remote gh-pages branch
        try {
          await exec.exec("git", ["pull", "origin", "gh-pages"], {
            cwd: repoDir,
          });
          core.info("📥 Pulled latest changes from remote gh-pages branch");
        } catch (pullError) {
          core.warning(
            "⚠️ Could not pull from remote gh-pages branch, continuing with local branch"
          );
        }
      } catch {
        // Check if gh-pages branch exists remotely
        try {
          await exec.exec(
            "git",
            ["checkout", "-b", "gh-pages", "origin/gh-pages"],
            {
              cwd: repoDir,
            }
          );
          core.info("📋 Created local gh-pages branch from remote");
        } catch {
          // Create new orphan branch if it doesn't exist remotely either
          await exec.exec("git", ["checkout", "--orphan", "gh-pages"], {
            cwd: repoDir,
          });
          core.info("📋 Created new orphan gh-pages branch");
        }
      }

      // Remove all existing files except .git
      const files = fs.readdirSync(repoDir);
      for (const file of files) {
        if (file !== ".git") {
          const filePath = path.join(repoDir, file);
          if (fs.statSync(filePath).isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
        }
      }

      // Copy the built documentation to the repository
      core.info("📋 Copying documentation files...");
      await copyDirectory(outputPath, repoDir);

      // Add all files to git
      await exec.exec("git", ["add", "."], { cwd: repoDir });

      // Check if there are changes to commit
      const { stdout: statusOutput } = await exec.getExecOutput(
        "git",
        ["status", "--porcelain"],
        { cwd: repoDir }
      );

      if (statusOutput.trim()) {
        // Commit changes
        const commitMessage = `Deploy documentation from ${github.context.sha}`;
        await exec.exec("git", ["commit", "-m", commitMessage], {
          cwd: repoDir,
        });

        // Push to gh-pages branch
        core.info("📤 Pushing to gh-pages branch...");
        try {
          await exec.exec("git", ["push", "origin", "gh-pages"], {
            cwd: repoDir,
          });
        } catch (pushError) {
          // If push fails due to conflicts, try force push
          core.warning("⚠️ Regular push failed, attempting force push...");
          await exec.exec("git", ["push", "--force", "origin", "gh-pages"], {
            cwd: repoDir,
          });
          core.info("✅ Force push successful");
        }

        core.info("✅ Successfully deployed to GitHub Pages!");
      } else {
        core.info("ℹ️ No changes to deploy");
      }
    } finally {
      // Clean up temporary directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        core.warning(
          `Cleanup warning: ${
            cleanupError instanceof Error
              ? cleanupError.message
              : String(cleanupError)
          }`
        );
      }
    }
  } catch (error) {
    core.error(
      `❌ Failed to deploy to GitHub Pages: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}

async function copyDirectory(src: string, dest: string): Promise<void> {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    // Copy all items in the directory
    const items = fs.readdirSync(src);
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      await copyDirectory(srcPath, destPath);
    }
  } else {
    // Copy file
    fs.copyFileSync(src, dest);
  }
}

// Run the action
run();

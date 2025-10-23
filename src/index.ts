#!/usr/bin/env node

import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as io from "@actions/io";
import * as github from "@actions/github";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

interface ActionInputs {
  contentPath: string;
  githubToken: string;
  outputDir?: string;
  templateUrl?: string;
  force?: boolean;
  downloadDir?: string;
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
    };

    core.info("🚀 Starting Speed Docs GitHub Action");
    core.info(`📁 Content path: ${inputs.contentPath}`);
    core.info(`📁 Output directory: ${inputs.outputDir}`);

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

    core.info(`🔨 Running speed-docs command: ${speedDocsCommand.join(" ")}`);

    // Run speed-docs CLI
    const exitCode = await exec.exec("npx", speedDocsCommand, {
      cwd: process.cwd(),
    });

    if (exitCode !== 0) {
      throw new Error(`speed-docs command failed with exit code ${exitCode}`);
    }

    core.info("✅ Speed docs build completed successfully");

    // Verify output directory exists
    const outputPath = path.resolve(inputs.outputDir!);
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Output directory not found: ${outputPath}`);
    }

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
    const repositoryUrl = `https://${githubToken}@github.com/${owner}/${repo}.git`;

    core.info(`📦 Repository: ${owner}/${repo}`);

    // Create a temporary directory for the deployment
    const tempDir = fs.mkdtempSync(path.join(process.cwd(), "deploy-"));

    try {
      // Clone the repository
      core.info("📥 Cloning repository...");
      await exec.exec("git", ["clone", "--depth=1", repositoryUrl, tempDir]);

      // Switch to gh-pages branch or create it
      const repoDir = path.join(tempDir, repo);
      await exec.exec("git", ["checkout", "--orphan", "gh-pages"], {
        cwd: repoDir,
      });

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
        await exec.exec("git", ["push", "origin", "gh-pages"], {
          cwd: repoDir,
        });

        core.info("✅ Successfully deployed to GitHub Pages!");
      } else {
        core.info("ℹ️ No changes to deploy");
      }
    } finally {
      // Clean up temporary directory
      fs.rmSync(tempDir, { recursive: true, force: true });
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

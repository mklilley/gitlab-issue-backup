const axios = require("axios");
const fs = require("fs");

const ENV = require("./env.json");
const PRIVATE_TOKEN = ENV.private_token;
const PROJECT_PATH = ENV.project_path;

const GITLAB_API_BASE = "https://gitlab.com/api/v4";
const OUTPUT_FILE = "gitlab_issues_backup.json";

async function main() {
  try {
    const urlEncodedProjectPath = encodeURIComponent(PROJECT_PATH);
    const projectId = await fetchProjectId(urlEncodedProjectPath);
    console.log(`Fetch ProjectId successful`);
    const issues = await fetchIssues(projectId);
    await backupIssues(issues, OUTPUT_FILE);
    console.log(`Backup complete. Issues saved in ${OUTPUT_FILE}`);
  } catch (error) {
    console.error("Error occurred:", error.message);
  }
}

async function fetchProjectId(urlEncodedProjectPath) {
  const response = await axios.get(
    `${GITLAB_API_BASE}/projects/${urlEncodedProjectPath}`,
    {
      headers: {
        "PRIVATE-TOKEN": PRIVATE_TOKEN,
      },
    }
  );

  return response.data.id;
}

async function fetchIssues(projectId) {
  const issues = [];
  let page = 1;

  while (true) {
    const response = await axios.get(
      `${GITLAB_API_BASE}/projects/${projectId}/issues`,
      {
        headers: {
          "PRIVATE-TOKEN": PRIVATE_TOKEN,
        },
        params: {
          per_page: 100,
          page: page,
        },
      }
    );

    if (response.data.length === 0) {
      break;
    }

    for (const issue of response.data) {
      const comments = await fetchIssueComments(projectId, issue.iid);
      issues.push({
        ...issue,
        comments,
      });
      console.log(`Fetch comments for issue ${issue.iid} successful`);
    }

    page++;
  }

  return issues;
}

async function fetchIssueComments(projectId, issueIid) {
  const comments = [];
  let page = 1;

  while (true) {
    const response = await axios.get(
      `${GITLAB_API_BASE}/projects/${projectId}/issues/${issueIid}/notes`,
      {
        headers: {
          "PRIVATE-TOKEN": PRIVATE_TOKEN,
        },
        params: {
          per_page: 100,
          page: page,
        },
      }
    );

    if (response.data.length === 0) {
      break;
    }

    comments.push(...response.data);
    page++;
  }

  return comments;
}

function backupIssues(issues, outputFile) {
  return new Promise((resolve, reject) => {
    fs.writeFile(outputFile, JSON.stringify(issues, null, 2), (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

main();

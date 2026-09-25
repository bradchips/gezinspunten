const SUPABASE_URL = "https://psskyozvzmgfppbpkxkl.supabase.co";
const SUPABASE_KEY = "sb_publishable_RB-K8vKRIk80fzUnO6bjaQ_bak6QV-e";
const FAMILY_ID = "535e95f7-ef01-4cab-80e0-504aa298475e";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let children = [];
let tasks = [];
let rewards = [];
let pointTransactions = [];
let taskSubmissions = [];
let activeChild = null;

const $ = (selector) => document.querySelector(selector);

function showError(message) {
  console.error(message);

  const toast = $("#toast");
  if (toast) {
    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }
}

async function loadApp() {
  console.log("Supabase laden...");

  const [
  childrenResult,
  tasksResult,
  rewardsResult,
  pointsResult,
  submissionsResult
] = await Promise.all([
    db
      .from("children")
      .select("*")
      .eq("family_id", FAMILY_ID)
      .eq("active", true),

    db
      .from("tasks")
      .select("*")
      .eq("family_id", FAMILY_ID),

    db
      .from("rewards")
      .select("*")
      .eq("family_id", FAMILY_ID),

    db
      .from("point_transactions")
      .select("*")
      .eq("family_id", FAMILY_ID),

    db
      .from("task_submissions")
      .select("*")
      .eq("family_id", FAMILY_ID) 
    
  ]);

  if (childrenResult.error) {
    showError(
      "Kinderen laden mislukt: " +
      childrenResult.error.message
    );
    return;
  }

  if (tasksResult.error) {
    showError(
      "Taken laden mislukt: " +
      tasksResult.error.message
    );
    return;
  }

  if (rewardsResult.error) {
    showError(
      "Beloningen laden mislukt: " +
      rewardsResult.error.message
    );
    return;
  }

  if (pointsResult.error) {
  showError(
    "Punten laden mislukt: " +
    pointsResult.error.message
  );
  return;
}

  if (submissionsResult.error) {
  showError(
    "Aanvragen laden mislukt: " +
    submissionsResult.error.message
  );
  return;
}
  
  children = childrenResult.data || [];
  tasks = tasksResult.data || [];
  rewards = rewardsResult.data || [];
  pointTransactions = pointsResult.data || [];
  taskSubmissions = submissionsResult.data || [];

  console.log("Kinderen:", children);
  console.log("Taken:", tasks);
  console.log("Beloningen:", rewards);

  if (!children.length) {
    showError("Geen kinderen gevonden.");
    return;
  }

  activeChild = children.find(
    child => child.name === "Sem"
  ) || children[0];

  render();
}

function render() {
  renderChildren();
  renderScore();
  renderTasks();
  renderRewards();
}

function renderChildren() {
  const container = $("#children");

  if (!container) return;

  container.innerHTML = children.map(child => `
    <button
      class="child ghost ${
        child.id === activeChild.id ? "selected" : ""
      }"
      data-child-id="${child.id}"
    >
      ${child.emoji || "🙂"}<br>
      <small>${child.name}</small>
    </button>
  `).join("");

  container
    .querySelectorAll("[data-child-id]")
    .forEach(button => {
      button.addEventListener("click", () => {
        activeChild = children.find(
          child => child.id === button.dataset.childId
        );

        render();
      });
    });
}

function getScore(childId) {
  return pointTransactions
    .filter(transaction => transaction.child_id === childId)
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount || 0),
      0
    );
}

function renderScore() {
  if (!activeChild) return;

  $("#childName").textContent = activeChild.name;

  const score = getScore(activeChild.id);
  
  $("#score").textContent = score;

  const sortedRewards = [...rewards]
    .sort((a, b) => a.cost - b.cost);

  const nextReward = sortedRewards.find(
    reward => reward.cost > score
  );

  if (!nextReward) {
    $("#nextReward").textContent =
      "Alle beloningen bereikt 🎉";

    $("#rewardProgress").value = 100;
    return;
  }

  $("#nextReward").textContent =
    `${nextReward.emoji || "🎁"} ` +
    `${nextReward.name} · ${nextReward.cost} ⭐`;

  $("#rewardProgress").value =
    Math.min(
      100,
      (score / nextReward.cost) * 100
    );
}

function renderTasks() {
  const container = $("#tasks");

  if (!container) return;

  container.innerHTML = tasks.map(task => {
  const isPending = taskSubmissions.some(
    submission =>
      submission.task_id === task.id &&
      submission.child_id === activeChild.id &&
      submission.status === "pending"
  );

  return `
    <div class="card">
      <div class="meta">
        <b>
          ${task.emoji || "✅"}
          ${task.name}
        </b>

        <small>
          +${task.points} ⭐ na goedkeuring
        </small>
      </div>

      <button
  class="task-button"
  data-task-id="${task.id}"
  ${isPending ? "disabled" : ""}
>
  ${isPending ? "Aangevraagd ✓" : "Klaar"}
</button>
        </div>
  `;
}).join("");

  container
  .querySelectorAll("[data-task-id]")
  .forEach(button => {
    button.addEventListener("click", async () => {
      const task = tasks.find(
        item => item.id === button.dataset.taskId
      );

      if (!task || !activeChild) {
        alert("Taak of kind niet gevonden.");
        return;
      }

      button.disabled = true;
      button.textContent = "Bezig...";

      const { data, error } = await db
        .from("task_submissions")
        .insert({
          family_id: FAMILY_ID,
          child_id: activeChild.id,
          task_id: task.id,
          status: "pending"
        })
        .select();

      if (error) {
        console.error("Aanvraag opslaan mislukt:", error);
        alert("Aanvraag opslaan mislukt: " + error.message);

        button.disabled = false;
        button.textContent = "Klaar";
        return;
      }

      console.log("Aanvraag opgeslagen:", data);

      taskSubmissions.push(data[0]);
      
      button.textContent = "Aangevraagd ✓";
      alert(
        `${activeChild.name} heeft "${task.name}" ingediend voor goedkeuring.`
      );
    });
  });
}

function renderRewards() {
  const container = $("#rewards");

  if (!container) return;

  const sortedRewards = [...rewards]
    .sort((a, b) => a.cost - b.cost);

  container.innerHTML = sortedRewards.map(reward => `
    <div class="card">
      <div class="meta">
        <b>
          ${reward.emoji || "🎁"}
          ${reward.name}
        </b>

        <small>
          ${reward.cost} ⭐
        </small>
      </div>

      <button disabled>
        Inwisselen
      </button>
    </div>
  `).join("");
}

$("#modeBtn").addEventListener("click", () => {
  $("#pinInput").value = "";
  $("#pinError").textContent = "";
  $("#pinDialog").showModal();
});

loadApp();

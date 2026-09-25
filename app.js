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
  renderPending();
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

function renderPending() {
  const container = $("#pending");
  if (!container) return;

  const pending = taskSubmissions.filter(
    submission => submission.status === "pending"
  );

  if (!pending.length) {
    container.innerHTML = "<p>Geen openstaande aanvragen.</p>";
    return;
  }

  container.innerHTML = pending.map(submission => {
    const child = children.find(
      item => item.id === submission.child_id
    );

    const task = tasks.find(
      item => item.id === submission.task_id
    );

    return `
      <div class="card">
        <div class="meta">
          <b>
            ${child?.emoji || "👤"}
            ${child?.name || "Onbekend"}
          </b>

          <span>
            ${task?.emoji || "✅"}
            ${task?.name || "Onbekende taak"}
          </span>

          <small>
            +${task?.points || 0} ⭐
          </small>
        </div>

        <button
  class="approve-button"
  data-submission-id="${submission.id}"
>
  Goedkeuren
</button>
      </div>
    `;
  }).join("");

container
  .querySelectorAll(".approve-button")
  .forEach(button => {
    button.addEventListener("click", async () => {
      const submissionId = button.dataset.submissionId;

      button.disabled = true;
      button.textContent = "Bezig...";

      const { error } = await db
        .from("task_submissions")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString()
        })
        .eq("id", submissionId);

      if (error) {
        console.error("Goedkeuren mislukt:", error);
        alert("Goedkeuren mislukt: " + error.message);

        button.disabled = false;
        button.textContent = "Goedkeuren";
        return;
      }

      alert("Aanvraag goedgekeurd ✓");
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

$("#pinSubmit").addEventListener("click", (event) => {
  event.preventDefault();

  if ($("#pinInput").value !== "1234") {
    $("#pinError").textContent = "PIN klopt niet.";
    return;
  }

  $("#pinDialog").close();
  $("#childView").hidden = true;
  $("#parentView").hidden = false;
  $("#title").textContent = "Oudermodus";

  renderParent();
});

$("#backBtn").addEventListener("click", () => {
  $("#parentView").hidden = true;
  $("#childView").hidden = false;
  $("#title").textContent = "Vandaag";

  render();
});

function renderParent() {
  renderAdjustments();

  const pendingContainer = $("#pending");

  if (!pendingContainer) return;

  const pendingSubmissions = taskSubmissions.filter(
    submission => submission.status === "pending"
  );

  if (pendingSubmissions.length === 0) {
    pendingContainer.innerHTML = `
      <div class="card">
        <div class="meta">
          <b>Geen aanvragen</b>
          <small>Er wacht niets op goedkeuring.</small>
        </div>
      </div>
    `;
    return;
  }
    pendingContainer.innerHTML = pendingSubmissions.map(submission => {
    const child = children.find(
      child => child.id === submission.child_id
    );

    const task = tasks.find(
      task => task.id === submission.task_id
    );

    if (!child || !task) return "";

    return `
      <div class="card">
        <div class="meta">
          <b>${child.emoji || "👦"} ${child.name}</b>
          <span>${task.emoji || "✅"} ${task.name}</span>
          <small>+${task.points} ⭐</small>
        </div>

        <button
          class="approve-button"
          data-submission-id="${submission.id}"
        >
          Goedkeuren
        </button>
      </div>
    `;
  }).join("");

  pendingContainer
    .querySelectorAll(".approve-button")
    .forEach(button => {
      button.addEventListener("click", async () => {
        const submissionId = button.dataset.submissionId;

        const submission = taskSubmissions.find(
          item => item.id === submissionId
        );

        if (!submission) return;

        const task = tasks.find(
          item => item.id === submission.task_id
        );

        if (!task) return;

        button.disabled = true;
        button.textContent = "Bezig...";

        const { error: pointsError } = await db
  .from("point_transactions")
  .insert({
    family_id: FAMILY_ID,
    child_id: submission.child_id,
    amount: task.points,
    transaction_type: "task",
    description: task.name,
    submission_id: submission.id
  });

        if (pointsError) {
          console.error("Punten toevoegen mislukt:", pointsError);
          alert("Punten toevoegen mislukt: " + pointsError.message);
          button.disabled = false;
          button.textContent = "Goedkeuren";
          return;
        }

        const { error: updateError } = await db
          .from("task_submissions")
          .update({
            status: "approved"
          })
          .eq("id", submission.id);

        if (updateError) {
          console.error("Goedkeuren mislukt:", updateError);
          alert("Goedkeuren mislukt: " + updateError.message);
          return;
        }

        alert(`Goedgekeurd! +${task.points} ⭐`);

        await loadApp();
        renderParent();
      });
    });
  
}

function renderAdjustments() {
  const container = $("#adjustments");

  if (!container) return;

  container.innerHTML = children.map(child => `
    <div class="card">
      <div class="meta">
        <b>${child.emoji || "👦"} ${child.name}</b>
        <small>Geef direct punten</small>
      </div>

      <div class="actions">
        <button
          class="quick-points"
          data-child-id="${child.id}"
          data-points="1"
        >
          +1 ⭐
        </button>

        <button
          class="quick-points"
          data-child-id="${child.id}"
          data-points="2"
        >
          +2 ⭐
        </button>

        <button
          class="quick-points"
          data-child-id="${child.id}"
          data-points="5"
        >
          +5 ⭐
        </button>
      </div>
    </div>
  `).join("");
}

loadApp();

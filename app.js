const API = "https://jsonplaceholder.typicode.com";
const PAGE_SIZE = 10;

const postsElement = document.querySelector("#posts");
const statusElement = document.querySelector("#status");
const searchInput = document.querySelector("#searchInput");

const postDialog = document.querySelector("#postDialog");
const postForm = document.querySelector("#postForm");
const detailDialog = document.querySelector("#detailDialog");

const state = {
  posts: [],
  filteredPosts: [],
  currentPage: 1,
  search: "",
  editingId: null,
};

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.status === 204 ? null : response.json();
}

async function loadPosts() {
  postsElement.innerHTML = "<p>Loading posts...</p>";

  try {
    state.posts = await apiRequest("/posts");
    state.posts.sort((a, b) => a.id - b.id);
    applySearch();
  } catch (error) {
    postsElement.textContent = "Failed to load posts.";
    console.error(error);
  }
}

function applySearch() {
  const query = state.search.trim().toLowerCase();

  state.filteredPosts = state.posts.filter((post) => {
    const content = `${post.title} ${post.body} ${post.id} ${post.userId}`;

    return content.toLowerCase().includes(query);
  });

  const pageCount = Math.max(
    1,
    Math.ceil(state.filteredPosts.length / PAGE_SIZE),
  );

  state.currentPage = Math.min(state.currentPage, pageCount);
  renderPosts();
}

function renderPosts() {
  const total = state.filteredPosts.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (state.currentPage - 1) * PAGE_SIZE;

  const currentPosts = state.filteredPosts.slice(start, start + PAGE_SIZE);

  statusElement.textContent = `${total} posts found`;

  if (currentPosts.length === 0) {
    postsElement.innerHTML = "<p>No posts found.</p>";
  } else {
    postsElement.innerHTML = currentPosts
      .map(
        (post) => `
      <article class="post">
        <small>Post #${post.id} · User ${post.userId}</small>
        <h2>${post.title}</h2>
        <p>${post.body}</p>

        <div class="post-actions">
          <button data-action="view" data-id="${post.id}">
            Details
          </button>
          <button data-action="edit" data-id="${post.id}">
            Edit
          </button>
          <button class="delete-btn"
            data-action="delete" data-id="${post.id}">
            Delete
          </button>
        </div>
      </article>
    `,
      )
      .join("");
  }

  document.querySelector("#pageInfo").textContent =
    `Page ${state.currentPage} of ${pageCount}`;

  document.querySelector("#prevBtn").disabled = state.currentPage === 1;

  document.querySelector("#nextBtn").disabled = state.currentPage === pageCount;
}

document.querySelector("#prevBtn").addEventListener("click", () => {
  if (state.currentPage > 1) {
    state.currentPage--;
    renderPosts();
  }
});

document.querySelector("#nextBtn").addEventListener("click", () => {
  const pageCount = Math.ceil(state.filteredPosts.length / PAGE_SIZE);

  if (state.currentPage < pageCount) {
    state.currentPage++;
    renderPosts();
  }
});

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  state.currentPage = 1;
  applySearch();
});

function viewPost(id) {
  const post = state.posts.find((post) => post.id === id);
  if (!post) return;

  document.querySelector("#detailMeta").textContent =
    `Post #${post.id} · User ${post.userId}`;

  document.querySelector("#detailTitle").textContent = post.title;
  document.querySelector("#detailBody").textContent = post.body;

  detailDialog.showModal();
}

function openCreateForm() {
  state.editingId = null;
  postForm.reset();

  document.querySelector("#userId").value = 1;
  document.querySelector("#formHeading").textContent = "Add Post";
  document.querySelector("#saveBtn").textContent = "Create Post";
  document.querySelector("#formError").textContent = "";

  postDialog.showModal();
}

function openEditForm(id) {
  const post = state.posts.find((post) => post.id === id);
  if (!post) return;

  state.editingId = id;

  document.querySelector("#title").value = post.title;
  document.querySelector("#body").value = post.body;
  document.querySelector("#userId").value = post.userId;

  document.querySelector("#formHeading").textContent = "Edit Post";
  document.querySelector("#saveBtn").textContent = "Save Changes";
  document.querySelector("#formError").textContent = "";

  postDialog.showModal();
}

postForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = document.querySelector("#title").value.trim();
  const body = document.querySelector("#body").value.trim();
  const userId = Number(document.querySelector("#userId").value);

  if (
    !title ||
    !body ||
    !Number.isInteger(userId) ||
    userId < 1 ||
    userId > 10
  ) {
    document.querySelector("#formError").textContent =
      "Enter a title, content and a user ID from 1 to 10.";
    return;
  }

  const editing = state.editingId !== null;
  const saveButton = document.querySelector("#saveBtn");
  saveButton.disabled = true;

  try {
    const payload = { title, body, userId };

    if (editing) {
      const id = state.editingId;

      await apiRequest(`/posts/${id}`, {
        method: "PUT",
        body: JSON.stringify({ id, ...payload }),
      });

      state.posts = state.posts.map((post) =>
        post.id === id ? { ...post, ...payload } : post,
      );
    } else {
      const created = await apiRequest("/posts", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const id = Math.max(0, ...state.posts.map((post) => post.id)) + 1;

      state.posts.unshift({ ...created, ...payload, id });
    }

    postDialog.close();
    state.currentPage = 1;
    applySearch();
  } catch (error) {
    document.querySelector("#formError").textContent =
      "Could not save the post. Try again.";
    console.error(error);
  } finally {
    saveButton.disabled = false;
  }
});

async function deletePost(id) {
  const post = state.posts.find((post) => post.id === id);
  if (!post) return;

  if (!confirm(`Delete "${post.title}"?`)) return;

  try {
    await apiRequest(`/posts/${id}`, { method: "DELETE" });

    state.posts = state.posts.filter((post) => post.id !== id);

    applySearch();
    statusElement.textContent = `Post #${id} deleted.`;
  } catch (error) {
    alert("Could not delete the post.");
    console.error(error);
  }
}

postsElement.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;

  if (action === "view") viewPost(id);
  if (action === "edit") openEditForm(id);
  if (action === "delete") deletePost(id);
});

document.querySelector("#addPostBtn").addEventListener("click", openCreateForm);

document.querySelector("#cancelBtn").addEventListener("click", () => {
  postDialog.close();
});

document.querySelector("#closeDetailBtn").addEventListener("click", () => {
  detailDialog.close();
});

loadPosts();

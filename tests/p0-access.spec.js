import { expect, test } from "@playwright/test";
import { login, mockApi } from "./helpers/apiFixtures.js";

const deniedCapabilities = {
  view: true,
  oversee_read: false,
  manage_members: false,
  manage_monitors: false,
  manage_settings: false,
  create_workspace: false,
};

const allowedCapabilities = {
  view: true,
  oversee_read: true,
  manage_members: true,
  manage_monitors: true,
  manage_settings: true,
  create_workspace: true,
};

const json = (route, status, body) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

test("Team assigns, updates, moves and removes Unit members through the runtime contract", async ({
  page,
}) => {
  const calls = await mockApi(page, { multipleWorkspaces: true });
  page.on("dialog", (dialog) => dialog.accept());
  await login(page);
  await page.goto("/settings?section=team");

  const workspaceMembers = page.getByRole("region", {
    name: "Workspace members",
  });
  const unitMembers = page.getByRole("region", { name: "Unit members" });
  const invitationTable = page.getByRole("region", { name: "Invitations" });
  const unitSearch = page.locator(".team-search");
  for (const table of [workspaceMembers, unitMembers, invitationTable])
    await expect(table).toHaveAttribute("tabindex", "0");
  await expect(workspaceMembers.getByText("Brenda Eze")).toBeVisible();
  await expect(unitMembers.getByText("Chidi Nwosu")).toBeVisible();
  await expect(invitationTable).toContainText("new.official@example.com");
  await expect(page.getByText(
    "Fallback for unregistered email addresses",
  )).toBeVisible();

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  expect(
    calls.some(
      (call) =>
        call.path === "/units/unit-1/members" &&
        new URL(call.url).searchParams.get("page") === "2",
    ),
  ).toBe(true);

  await page.getByLabel("Search Unit members").fill("Chidi");
  await unitSearch.getByRole("button", { name: "Search" }).click();
  const chidiPoolRow = unitMembers.getByRole("row").filter({ hasText: "Chidi Nwosu" });
  await chidiPoolRow.getByRole("button", { name: "Assign here" }).click();
  await expect(
    workspaceMembers.getByRole("row").filter({ hasText: "Chidi Nwosu" }),
  ).toBeVisible();
  expect(
    calls.find(
      (call) =>
        call.path === "/workspaces/w-1/members" && call.method === "POST",
    ).body,
  ).toEqual({ user_id: "u-3", role: "member" });
  await expect(page.getByLabel("Search Unit members")).toHaveValue("Chidi");

  let brendaRow = workspaceMembers
    .getByRole("row")
    .filter({ hasText: "Brenda Eze" });
  await brendaRow.getByLabel("Role for Brenda Eze").selectOption("admin");
  await brendaRow.getByRole("button", { name: "Save role" }).click();
  expect(
    calls.find(
      (call) =>
        call.path === "/workspaces/w-1/members/u-2" &&
        call.method === "PATCH",
    ).body,
  ).toEqual({ role: "admin" });
  await expect(page.getByLabel("Search Unit members")).toHaveValue("Chidi");

  await page.getByLabel("Search Unit members").fill("Dami");
  await unitSearch.getByRole("button", { name: "Search" }).click();
  const damiPoolRow = unitMembers.getByRole("row").filter({ hasText: "Dami Uche" });
  await damiPoolRow.getByRole("button", { name: "Move here" }).click();
  await expect(
    workspaceMembers.getByRole("row").filter({ hasText: "Dami Uche" }),
  ).toBeVisible();
  expect(
    calls.find(
      (call) =>
        call.path === "/workspaces/w-2/members/u-4/move" &&
        call.method === "POST",
    ).body,
  ).toEqual({ target_workspace_id: "w-1" });

  brendaRow = workspaceMembers.getByRole("row").filter({ hasText: "Brenda Eze" });
  await brendaRow.getByRole("button", { name: "Move", exact: true }).click();
  await expect(brendaRow).toHaveCount(0);
  expect(
    calls.find(
      (call) =>
        call.path === "/workspaces/w-1/members/u-2/move" &&
        call.method === "POST",
    ).body,
  ).toEqual({ target_workspace_id: "w-2" });

  const chidiMemberRow = workspaceMembers
    .getByRole("row")
    .filter({ hasText: "Chidi Nwosu" });
  await chidiMemberRow.getByRole("button", { name: "Remove" }).click();
  await expect(chidiMemberRow).toHaveCount(0);
  expect(
    calls.some(
      (call) =>
        call.path === "/workspaces/w-1/members/u-3" &&
        call.method === "DELETE",
    ),
  ).toBe(true);

  const ownerRow = workspaceMembers.getByRole("row").filter({ hasText: "Ada Okafor" });
  await expect(ownerRow.getByLabel("Role for Ada Okafor")).toBeDisabled();
  await expect(ownerRow).toContainText("Cannot be changed");
  expect(calls.filter((call) => call.path === "/auth/me").length).toBeGreaterThan(1);
});

test("canonical owner transfers workspace ownership and refreshes Team state", async ({
  page,
}) => {
  await mockApi(page);
  await login(page);
  await page.goto("/settings?section=team");

  const members = page.getByRole("region", { name: "Workspace members" });
  const brenda = members.getByRole("row").filter({ hasText: "Brenda Eze" });
  await brenda.getByRole("button", { name: "Transfer ownership" }).click();
  const dialog = page.getByRole("dialog", { name: "Transfer ownership" });
  await dialog
    .getByLabel("I understand that this changes the workspace owner immediately.")
    .check();
  await dialog.getByRole("button", { name: "Transfer ownership" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(members.getByRole("row").filter({ hasText: "Brenda Eze" })).toContainText(
    "Owner",
  );
  await expect(members.getByRole("row").filter({ hasText: "Ada Okafor" })).toContainText(
    "Admin",
  );
  await expect(page.getByText("Workspace ownership transferred.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Transfer ownership" })).toHaveCount(0);
});

test("ownership transfer sends the selected previous-owner role and reason", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await login(page);
  await page.goto("/settings?section=team");

  const brenda = page
    .getByRole("region", { name: "Workspace members" })
    .getByRole("row")
    .filter({ hasText: "Brenda Eze" });
  await brenda.getByRole("button", { name: "Transfer ownership" }).click();
  const dialog = page.getByRole("dialog", { name: "Transfer ownership" });
  await dialog.getByLabel("Your role after transfer").selectOption("member");
  await dialog.getByLabel("Reason (optional)").fill("Incoming office director");
  await dialog
    .getByLabel("I understand that this changes the workspace owner immediately.")
    .check();
  await dialog.getByRole("button", { name: "Transfer ownership" }).click();

  const transfer = calls.find(
    (call) =>
      call.path === "/workspaces/w-1/ownership-transfer" &&
      call.method === "POST",
  );
  expect(transfer.body).toEqual({
    new_owner_id: "u-2",
    previous_owner_role: "member",
    reason: "Incoming office director",
  });
});

test("ownership transfer can be cancelled without making a request", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await login(page);
  await page.goto("/settings?section=team");

  const brenda = page
    .getByRole("region", { name: "Workspace members" })
    .getByRole("row")
    .filter({ hasText: "Brenda Eze" });
  await brenda.getByRole("button", { name: "Transfer ownership" }).click();
  const dialog = page.getByRole("dialog", { name: "Transfer ownership" });
  await dialog.getByRole("button", { name: "Cancel" }).click();

  await expect(dialog).toHaveCount(0);
  expect(
    calls.some((call) => call.path.endsWith("/ownership-transfer")),
  ).toBe(false);
  await expect(brenda).toContainText("Member");
});

test("ownership transfer is hidden from nonowners with member management access", async ({
  page,
}) => {
  await mockApi(page, {
    workspace: { owner_id: "u-owner", role: "admin" },
    actorMembership: { role: "admin" },
  });
  await login(page);
  await page.goto("/settings?section=team");

  await expect(page.getByRole("button", { name: "Transfer ownership" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Workspace members" })).toBeVisible();
});

test("failed ownership transfer preserves roles and shows only a safe conflict", async ({
  page,
}) => {
  await mockApi(page, { ownershipTransferError: 409 });
  await login(page);
  await page.goto("/settings?section=team");

  const members = page.getByRole("region", { name: "Workspace members" });
  const brenda = members.getByRole("row").filter({ hasText: "Brenda Eze" });
  await brenda.getByRole("button", { name: "Transfer ownership" }).click();
  const dialog = page.getByRole("dialog", { name: "Transfer ownership" });
  await dialog
    .getByLabel("I understand that this changes the workspace owner immediately.")
    .check();
  await dialog.getByRole("button", { name: "Transfer ownership" }).click();

  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("alert")).toHaveText(
    "Workspace ownership changed on the server. Refresh the Team page and try again.",
  );
  await expect(page.getByText("Internal ownership details")).toHaveCount(0);
  await expect(brenda).toContainText("Member");
  await expect(members.getByRole("row").filter({ hasText: "Ada Okafor" })).toContainText(
    "Owner",
  );
});

test("Team disables self role changes without blocking supported self removal", async ({
  page,
}) => {
  const calls = await mockApi(page, {
    workspace: { role: "admin" },
    actorMembership: { role: "admin" },
    account: { can_create_workspace: false },
  });
  await login(page);
  await page.goto("/settings?section=team");

  const actorRow = page
    .getByRole("region", { name: "Workspace members" })
    .getByRole("row")
    .filter({ hasText: "Ada Okafor" });
  await expect(actorRow.getByLabel("Role for Ada Okafor")).toBeDisabled();
  await expect(actorRow.getByRole("button", { name: "Save role" })).toHaveCount(0);
  await expect(actorRow.getByRole("button", { name: "Remove" })).toBeVisible();
  expect(
    calls.some(
      (call) =>
        call.path === "/workspaces/w-1/members/u-1" &&
        call.method === "PATCH",
    ),
  ).toBe(false);
});

test("Unit member pool does not offer self assignment", async ({ page }) => {
  const calls = await mockApi(page, {
    workspace: { role: null },
    actorMembership: null,
    account: { can_create_workspace: false },
  });
  await login(page);
  await page.goto("/settings?section=team");

  const actorRow = page
    .getByRole("region", { name: "Unit members" })
    .getByRole("row")
    .filter({ hasText: "Ada Okafor" });
  await expect(
    actorRow.getByLabel("Role in this workspace for Ada Okafor"),
  ).toBeDisabled();
  await expect(actorRow).toContainText("This is you");
  await expect(actorRow.getByRole("button", { name: "Assign here" })).toHaveCount(0);
  expect(
    calls.some(
      (call) =>
        call.path === "/workspaces/w-1/members" &&
        call.method === "POST" &&
        call.body?.user_id === "u-1",
    ),
  ).toBe(false);
});

test("canonical capabilities govern controls regardless of roles and global creation hints", async ({
  page,
}) => {
  const calls = await mockApi(page, {
    capabilities: deniedCapabilities,
    workspace: {
      role: "owner",
    },
    account: { can_create_workspace: false },
  });
  await login(page);

  await expect(page.getByRole("button", { name: "Add monitor" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "New office workspace" })).toHaveCount(0);
  await page.goto("/monitors");
  await expect(page.getByRole("button", { name: /Delete MTN Nigeria/ })).toHaveCount(0);
  await page.goto("/search?q=MTN");
  await page.getByRole("button", { name: /Verified backend result/ }).click();
  await expect(page.getByRole("button", { name: "Monitor topic" })).toHaveCount(0);

  await page.goto("/settings?section=notifications");
  await expect(
    page.getByRole("heading", { name: "Notifications", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Monitoring defaults/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Notifications/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Team/ })).toHaveCount(0);
  expect(
    calls.some((call) => call.path.endsWith("/settings/notifications")),
  ).toBe(true);
  await page.goto("/workspaces/new");
  await expect(
    page.getByRole("heading", {
      name: "Office workspace creation is managed by authorised officials",
    }),
  ).toBeVisible();
});

test("missing canonical capabilities fail closed", async ({
  page,
}) => {
  await mockApi(page, {
    capabilities: null,
    workspace: {
      role: "owner",
    },
    account: { can_create_workspace: false },
  });
  await login(page);
  await expect(page.getByRole("button", { name: "Add monitor" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "New office workspace" })).toHaveCount(0);
  await page.goto("/settings");
  await expect(page.getByRole("button", { name: /Monitoring defaults/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Team/ })).toHaveCount(0);
  await page.goto("/search?q=MTN");
  await expect(page.getByLabel("Search scope")).toHaveCount(0);
});

test("ordinary direct members keep personal notifications while global settings stay gated", async ({
  page,
}) => {
  const calls = await mockApi(page, {
    capabilities: deniedCapabilities,
    workspace: {
      role: "member",
    },
    actorMembership: { role: "member" },
    account: { can_create_workspace: false },
  });
  await login(page);
  await page.goto("/settings?section=notifications");

  await expect(
    page.getByRole("heading", { name: "Notifications", exact: true }),
  ).toBeVisible();
  await page.getByRole("switch", { name: "New result digest" }).uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Changes saved." }),
  ).toBeVisible();
  expect(
    calls.find(
      (call) =>
        call.path.endsWith("/settings/notifications") &&
        call.method === "PATCH",
    ).body,
  ).toEqual({ digest_cadence: "daily" });
  await expect(page.getByRole("button", { name: /Monitoring defaults/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Sources & languages/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Team/ })).toHaveCount(0);

  for (const section of ["monitoring", "sources", "team"]) {
    await page.goto(`/settings?section=${section}`);
    await expect(
      page.getByRole("heading", { name: "Search & discovery" }),
    ).toBeVisible();
  }
});

test("account-level creation scope remains available for an empty unrelated Unit", async ({
  page,
}) => {
  await mockApi(page, {
    capabilities: deniedCapabilities,
    units: [
      {
        id: "unit-2",
        name: "Health Unit",
        state: "Abia",
        type: "ministry",
        status: "active",
      },
    ],
    account: {
      can_create_workspace: true,
      oversight_scopes: [
        { state: "Abia", unit_id: "unit-2", can_manage_members: true },
      ],
    },
  });
  await login(page);

  await page.getByRole("link", { name: "New office workspace" }).click();
  await expect(page.getByRole("heading", { name: "Create another office workspace" })).toBeVisible();
  await expect(page.locator("#workspace-unit")).toHaveValue("unit-2");
  await expect(page.locator('#workspace-unit option[value="unit-2"]')).toContainText(
    "Health Unit",
  );
});

test("a selected workspace access failure refreshes authorization and chooses a valid fallback", async ({
  page,
}) => {
  await mockApi(page, { multipleWorkspaces: true, paginated: true });
  await login(page);
  let accountRefreshes = 0;
  await page.route("**/api/v1/auth/me", (route) => {
    accountRefreshes += 1;
    return json(route, 200, {
      user: { id: "u-1", name: "Ada Refreshed", is_approved: true },
    });
  });
  await page.route("**/api/v1/workspaces", (route) =>
    json(route, 200, {
      data: [
        {
          id: "w-2",
          parent_id: "w-1",
          name: "Second workspace",
          unit_id: "unit-1",
          role: "admin",
          capabilities: allowedCapabilities,
        },
      ],
    }),
  );
  await page.route("**/api/v1/workspaces/w-1/**", (route) =>
    json(route, 403, { message: "private upstream detail" }),
  );

  await page.getByRole("button", { name: "Next" }).click();
  await expect(
    page.getByRole("combobox", { name: "Workspace", exact: true }),
  ).toHaveAttribute("data-value", "w-2");
  await expect(page.getByText("Ada Refreshed", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Cybersecurity organisation/ })).toBeVisible();
  expect(accountRefreshes).toBeGreaterThan(0);
  expect(
    await page.evaluate(
      () =>
        localStorage.getItem("sentinel_session") ||
        sessionStorage.getItem("sentinel_session"),
    ),
  ).toBeTruthy();
});

test("the latest authorization refresh wins when an older response finishes last", async ({
  page,
}) => {
  await mockApi(page);
  await login(page);
  await page.evaluate(() => {
    const originalFetch = window.fetch.bind(window);
    window.__authorizationResponses = [];
    window.fetch = (input, init) => {
      const rawUrl = typeof input === "string" ? input : input.url;
      const url = new URL(rawUrl, window.location.href);
      if (url.pathname === "/api/v1/auth/me")
        return new Promise((resolve) => {
          window.__authorizationResponses.push((body) =>
            resolve(
              new Response(JSON.stringify(body), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }),
            ),
          );
        });
      return originalFetch(input, init);
    };
  });

  await page.evaluate(async () => {
    const { useAppStore } = await import("/src/stores/appStore.js");
    window.__olderAuthorization = useAppStore
      .getState()
      .refreshAuthorization();
  });
  await expect
    .poll(() => page.evaluate(() => window.__authorizationResponses.length))
    .toBe(1);
  await page.evaluate(async () => {
    const { useAppStore } = await import("/src/stores/appStore.js");
    window.__newerAuthorization = useAppStore
      .getState()
      .refreshAuthorization();
  });
  await expect
    .poll(() => page.evaluate(() => window.__authorizationResponses.length))
    .toBe(2);

  await page.evaluate(() => {
    window.__authorizationResponses[1]({
      user: {
        id: "u-1",
        name: "Newer Authorisation",
        email: "ada@example.com",
        is_approved: true,
        verification_status: "approved",
        can_create_workspace: false,
      },
    });
  });
  await expect(
    page.getByText("Newer Authorisation", { exact: true }),
  ).toBeVisible();

  await page.evaluate(() => {
    window.__authorizationResponses[0]({
      user: {
        id: "u-1",
        name: "Older Pending Authorisation",
        email: "ada@example.com",
        is_approved: false,
        verification_status: "pending",
        can_create_workspace: false,
      },
    });
  });
  await page.evaluate(() =>
    Promise.allSettled([
      window.__olderAuthorization,
      window.__newerAuthorization,
    ]),
  );
  const authorization = await page.evaluate(async () => {
    const { useAppStore } = await import("/src/stores/appStore.js");
    const state = useAppStore.getState();
    return {
      name: state.user?.name,
      approved: state.user?.is_approved,
      verificationStatus: state.user?.verification_status,
      workspaceId: state.workspaceId,
      workspaceIds: state.workspaces.map((item) => item.id),
    };
  });
  expect(authorization).toEqual({
    name: "Newer Authorisation",
    approved: true,
    verificationStatus: "approved",
    workspaceId: "w-1",
    workspaceIds: ["w-1"],
  });
});

test("an invitation 410 is safe and does not render arbitrary upstream text", async ({
  page,
}) => {
  await mockApi(page);
  await page.route("**/api/v1/invitations/expired", (route) =>
    json(route, 410, { message: "SQLSTATE secret invitation record" }),
  );
  await page.goto("/invitations/expired");
  await expect(
    page.getByRole("heading", {
      name: "This invitation has expired or was already used",
    }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveText(
    "This invitation has expired or has already been used.",
  );
  await expect(page.locator("body")).not.toContainText("SQLSTATE");
});

test("an invitation that becomes unavailable during acceptance has recovery actions", async ({
  page,
}) => {
  await mockApi(page);
  await login(page);
  await page.route("**/api/v1/invitations/action-gone/accept", (route) =>
    json(route, 410, { message: "SQLSTATE secret invitation record" }),
  );
  await page.route("**/api/v1/invitations/action-gone", (route) =>
    json(route, 200, {
      workspace: { id: "w-1", name: "Research workspace" },
      email: "ada@example.com",
      role: "member",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    }),
  );
  await page.goto("/invitations/action-gone");
  await page.getByRole("button", { name: "Accept invitation" }).click();

  await expect(
    page.getByRole("heading", { name: "This invitation is no longer available" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveText(
    "This invitation has expired or has already been used.",
  );
  await expect(
    page.getByRole("button", { name: "Check invitation again" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Return home" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("SQLSTATE");
});

test("pending invitation acceptance can retry and selects the accepted workspace", async ({
  page,
}) => {
  await mockApi(page, { multipleWorkspaces: true });
  await login(page);
  let attempts = 0;
  await page.route("**/api/v1/invitations/pending/accept", (route) => {
    attempts += 1;
    return attempts === 1
      ? json(route, 422, {
          message: "private pending detail",
          errors: { account: ["private roster detail"] },
        })
      : json(route, 200, { workspace: { id: "w-2" }, role: "member" });
  });
  await page.route("**/api/v1/invitations/pending", (route) =>
    json(route, 200, {
      workspace: { id: "w-2", name: "Second workspace" },
      email: "ada@example.com",
      role: "member",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    }),
  );
  await page.goto("/invitations/pending");
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Your account must be approved before you can accept this invitation.",
  );
  await expect(
    page.getByRole("button", { name: "Retry after approval" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry after approval" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("combobox", { name: "Workspace", exact: true }),
  ).toHaveAttribute("data-value", "w-2");
  expect(attempts).toBe(2);
  await expect(page.locator("body")).not.toContainText("private roster detail");
});

test("invitation success clears an earlier boot failure", async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "sentinel_session",
      JSON.stringify({
        token: "test-session-token",
        user: {
          id: "u-1",
          name: "Ada Okafor",
          email: "ada@example.com",
          is_approved: true,
          is_email_verified: true,
          email_verification_required: false,
        },
      }),
    ),
  );
  let accountCalls = 0;
  await page.route("**/api/v1/auth/me", (route) => {
    accountCalls += 1;
    return accountCalls === 1
      ? json(route, 503, { message: "private bootstrap failure" })
      : json(route, 200, {
          user: {
            id: "u-1",
            name: "Ada Okafor",
            email: "ada@example.com",
            is_approved: true,
            is_email_verified: true,
            email_verification_required: false,
          },
        });
  });
  await page.route("**/api/v1/invitations/recover/accept", (route) =>
    json(route, 200, { workspace: { id: "w-1" }, role: "member" }),
  );
  await page.route("**/api/v1/invitations/recover", (route) =>
    json(route, 200, {
      workspace: { id: "w-1", name: "Research workspace" },
      email: "ada@example.com",
      role: "member",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    }),
  );

  await page.goto("/invitations/recover");
  await expect(page.getByRole("heading", { name: "Join Research workspace" })).toBeVisible();
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await expect(
    page.getByRole("heading", { name: "What Sentinel found for you." }),
  ).toBeVisible();
  expect(accountCalls).toBe(2);
});

test("workspace creation remains successful when authorization refresh fails", async ({
  page,
}) => {
  const calls = await mockApi(page, {
    authorizationRefreshAfterCreateError: true,
  });
  await login(page);
  await page.getByRole("link", { name: "New office workspace" }).click();
  await page.getByLabel("Office workspace name").fill("New finance office");
  await page.getByLabel("Parent office (optional)").selectOption("w-1");
  await page.getByRole("button", { name: "Create workspace" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("combobox", { name: "Workspace", exact: true }),
  ).toHaveAttribute("data-value", "w-2");
  await expect(page.getByRole("alert")).toHaveText(
    "Workspace created. Some access details could not be refreshed; refresh the page before managing it.",
  );
  expect(
    calls.filter(
      (call) => call.path === "/workspaces" && call.method === "POST",
    ),
  ).toHaveLength(1);
});

test("root workspace conflict is recoverable and uses the Unit-aware payload", async ({
  page,
}) => {
  const calls = await mockApi(page, {
    noWorkspace: true,
    createWorkspaceConflict: true,
  });
  await page.goto("/signin");
  await page.getByLabel("Work email").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Office workspace name").fill("Finance root");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "This Unit already has a root office workspace. Choose a parent office to create a child workspace.",
  );
  const create = calls.find(
    (call) => call.path === "/workspaces" && call.method === "POST",
  );
  expect(create.body).toMatchObject({
    name: "Finance root",
    unit_id: "unit-1",
    level: "office",
  });
  expect(create.body).not.toHaveProperty("parent_id");
  await expect(page.getByLabel("Office workspace name")).toHaveValue(
    "Finance root",
  );
});

test("no-workspace status refreshes on focus and opens a newly assigned workspace", async ({
  page,
}) => {
  await mockApi(page, {
    noWorkspace: true,
    account: {
      can_create_workspace: false,
      oversight_scopes: [],
    },
  });
  await page.goto("/signin");
  await page.getByLabel("Work email").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No office workspace is assigned yet" }),
  ).toBeVisible();

  await page.route("**/api/v1/workspaces", (route) =>
    json(route, 200, {
      data: [
        {
          id: "w-1",
          name: "New assignment",
          unit_id: "unit-1",
          role: "member",
          capabilities: allowedCapabilities,
        },
      ],
    }),
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("heading", { name: "What Sentinel found for you." }),
  ).toBeVisible();
});

test("pending approval refreshes on focus without requiring a new sign-in", async ({
  page,
}) => {
  await mockApi(page, {
    noWorkspace: true,
    account: {
      is_approved: false,
      verification_status: "pending",
      can_create_workspace: false,
      oversight_scopes: [],
    },
  });
  await page.goto("/signin");
  await page.getByLabel("Work email").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your account is awaiting approval" }),
  ).toBeVisible();

  await page.route("**/api/v1/auth/me", (route) =>
    json(route, 200, {
      user: {
        id: "u-1",
        name: "Ada Okafor",
        email: "ada@example.com",
        is_approved: true,
        verification_status: "approved",
      },
    }),
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("heading", { name: "No office workspace is assigned yet" }),
  ).toBeVisible();
});

test("inactive roster login and bootstrap preserve the session without tenant requests", async ({
  page,
}) => {
  const calls = await mockApi(page, {
    account: { is_roster_active: false },
  });
  await page.goto("/signin");
  await page.getByLabel("Work email").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Your workspace access is paused" }),
  ).toBeVisible();
  await expect(page.getByText("Finance Unit", { exact: true })).toBeVisible();
  await expect(page.getByText("AB-001", { exact: true })).toBeVisible();
  expect(calls.filter((call) => call.path.startsWith("/workspaces"))).toHaveLength(0);
  expect(calls.filter((call) => /\/units\/[^/]+\/members/.test(call.path))).toHaveLength(0);
  expect(
    await page.evaluate(
      () =>
        localStorage.getItem("sentinel_session") ||
        sessionStorage.getItem("sentinel_session"),
    ),
  ).toBeTruthy();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your workspace access is paused" }),
  ).toBeVisible();
  expect(calls.filter((call) => call.path.startsWith("/workspaces"))).toHaveLength(0);
});

test("inactive roster focus refresh opens workspaces after reactivation", async ({
  page,
}) => {
  const calls = await mockApi(page, {
    account: { is_roster_active: false },
  });
  await page.goto("/signin");
  await page.getByLabel("Work email").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your workspace access is paused" }),
  ).toBeVisible();

  await page.route("**/api/v1/auth/me", (route) =>
    json(route, 200, {
      user: {
        id: "u-1",
        name: "Ada Okafor",
        email: "ada@example.com",
        is_approved: true,
        is_roster_active: true,
        verification_status: "approved",
      },
    }),
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));

  await expect(
    page.getByRole("heading", { name: "What Sentinel found for you." }),
  ).toBeVisible();
  expect(calls.some((call) => call.path === "/workspaces")).toBe(true);
});

test("inactive roster refresh renders only the safe mapped account error", async ({
  page,
}) => {
  await mockApi(page, {
    account: { is_roster_active: false },
  });
  await page.goto("/signin");
  await page.getByLabel("Work email").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your workspace access is paused" }),
  ).toBeVisible();

  await page.route("**/api/v1/auth/me", (route) =>
    json(route, 403, {
      code: "account_roster_inactive",
      message: "SQLSTATE private roster detail",
    }),
  );
  await page.getByRole("button", { name: "Refresh personnel status" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "Your linked personnel record is inactive. Contact your Unit administrator.",
  );
  await expect(page.locator("body")).not.toContainText("SQLSTATE");
});

test("an item 404 stays inside the authenticated workspace", async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.route("**/api/v1/workspaces/w-1/monitors/missing**", (route) =>
    json(route, 404, { message: "private record detail" }),
  );
  await page.goto("/monitors/missing");
  await expect(page.getByRole("alert")).toContainText(
    "This item is no longer available.",
  );
  await expect(page).toHaveURL(/\/monitors\/missing$/);
  expect(
    await page.evaluate(
      () =>
        localStorage.getItem("sentinel_session") ||
        sessionStorage.getItem("sentinel_session"),
    ),
  ).toBeTruthy();
  await expect(page.locator("body")).not.toContainText("private record detail");
});

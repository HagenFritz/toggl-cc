const BASE_URL = 'https://api.track.toggl.com/api/v9'

function authHeader(apiToken: string): string {
  return 'Basic ' + Buffer.from(`${apiToken}:api_token`).toString('base64')
}

export interface TogglUser {
  id: number
  email: string
  fullname: string
  default_workspace_id: number
}

export interface TogglWorkspace {
  id: number
  name: string
}

export interface TogglTimeEntry {
  id: number
  description: string
  start: string
  duration: number
  workspace_id: number
}

async function request<T>(
  method: string,
  path: string,
  apiToken: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: authHeader(apiToken),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    throw new Error(`Toggl API ${method} ${path} failed: ${res.status} ${res.statusText}`)
  }

  const text = await res.text()
  return text ? (JSON.parse(text) as T) : (null as T)
}

export async function getMe(apiToken: string): Promise<TogglUser> {
  return request<TogglUser>('GET', '/me', apiToken)
}

export async function getWorkspaces(apiToken: string): Promise<TogglWorkspace[]> {
  return request<TogglWorkspace[]>('GET', '/workspaces', apiToken)
}

export interface TogglProject {
  id: number
  name: string
  active: boolean
}

export async function getProjects(apiToken: string, workspaceId: number): Promise<TogglProject[]> {
  return request<TogglProject[]>('GET', `/workspaces/${workspaceId}/projects`, apiToken)
}

export async function getCurrentTimer(apiToken: string): Promise<TogglTimeEntry | null> {
  return request<TogglTimeEntry | null>('GET', '/me/time_entries/current', apiToken)
}

export async function startTimer(
  apiToken: string,
  workspaceId: number,
  description: string,
  projectId?: number,
): Promise<TogglTimeEntry> {
  return request<TogglTimeEntry>('POST', `/workspaces/${workspaceId}/time_entries`, apiToken, {
    description,
    workspace_id: workspaceId,
    project_id: projectId ?? null,
    start: new Date().toISOString(),
    duration: -1,
    created_with: 'toggl-cc',
  })
}

export async function stopTimer(
  apiToken: string,
  workspaceId: number,
  timerId: number,
): Promise<TogglTimeEntry> {
  return request<TogglTimeEntry>(
    'PATCH',
    `/workspaces/${workspaceId}/time_entries/${timerId}/stop`,
    apiToken,
  )
}

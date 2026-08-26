# API Examples

Run these against `http://localhost:4000/graphql` (GraphiQL/Yoga playground) or any GraphQL
client. For authenticated operations, set the HTTP header:

```
Authorization: Bearer <token from login/register>
```

## Register

```graphql
mutation Register {
  register(input: {
    name: "Riya Sharma"
    email: "riya@example.com"
    password: "Password123"
    role: REPORTER
  }) {
    token
    user { id name email role }
  }
}
```

## Login

```graphql
mutation Login {
  login(input: { email: "riya@example.com", password: "Password123" }) {
    token
    user { id name email role }
  }
}
```

## Create Ticket (as reporter)

```graphql
mutation CreateTicket {
  createTicket(input: {
    title: "Login page throws 500 error"
    description: "Users report a server error when submitting the login form."
    priority: HIGH
  }) {
    id
    title
    status
    priority
    sla {
      firstResponseDueAt
      resolutionDueAt
      firstResponseState
      resolutionState
    }
  }
}
```

## Assign Ticket (as agent)

```graphql
mutation AssignTicket {
  assignTicket(ticketId: "TICKET_ID", assigneeId: "AGENT_USER_ID") {
    id
    assignee { id name }
  }
}
```

## Change Ticket Status (as agent)

```graphql
mutation ChangeStatus {
  changeTicketStatus(ticketId: "TICKET_ID", status: IN_PROGRESS) {
    id
    status
  }
}
```

## Resolve Ticket (as agent)

```graphql
mutation ResolveTicket {
  resolveTicket(ticketId: "TICKET_ID") {
    id
    status
    resolvedAt
    sla {
      resolutionState
      resolutionRemainingMinutes
    }
  }
}
```

## Add Comment

```graphql
mutation AddComment {
  addComment(ticketId: "TICKET_ID", content: "Looking into this now.") {
    id
    content
    author { name role }
    createdAt
  }
}
```

## Dashboard

```graphql
query Dashboard {
  dashboard {
    openTickets
    inProgressTickets
    atRiskTickets
    breachedTickets
  }
}
```

## Users (agents only)

```graphql
query Agents {
  users(role: AGENT) {
    id
    name
    email
  }
}
```

## Holidays

```graphql
query Holidays {
  holidays {
    id
    date
    name
  }
}
```

## Filtering

```graphql
query FilteredTickets {
  tickets(status: OPEN, priority: URGENT, slaState: AT_RISK, take: 10) {
    nodes {
      id
      title
      sla { firstResponseState resolutionState }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

## Cursor Pagination

```graphql
query NextPage {
  tickets(take: 10, cursor: "PREVIOUS_PAGE_END_CURSOR") {
    nodes { id title }
    pageInfo { hasNextPage endCursor }
  }
}
```

## Ticket Detail (with comments)

```graphql
query TicketDetail {
  ticket(id: "TICKET_ID") {
    id
    title
    description
    priority
    status
    reporter { name }
    assignee { name }
    firstResponseAt
    resolvedAt
    comments {
      id
      content
      author { name role }
      createdAt
    }
    sla {
      firstResponseDueAt
      resolutionDueAt
      firstResponseState
      resolutionState
      firstResponseRemainingMinutes
      resolutionRemainingMinutes
    }
  }
}
```

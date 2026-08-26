import { gql } from "@apollo/client";
import { COMMENT_FIELDS, TICKET_FIELDS, USER_FIELDS } from "./fragments";

export const ME = gql`
  query Me {
    me {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const TICKETS = gql`
  query Tickets(
    $status: TicketStatus
    $priority: Priority
    $assigneeId: ID
    $slaState: SLAState
    $take: Int
    $cursor: String
  ) {
    tickets(
      status: $status
      priority: $priority
      assigneeId: $assigneeId
      slaState: $slaState
      take: $take
      cursor: $cursor
    ) {
      nodes {
        ...TicketFields
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  ${TICKET_FIELDS}
`;

export const TICKET = gql`
  query TicketDetail($id: ID!) {
    ticket(id: $id) {
      ...TicketFields
      comments {
        ...CommentFields
      }
    }
  }
  ${TICKET_FIELDS}
  ${COMMENT_FIELDS}
`;

export const DASHBOARD = gql`
  query Dashboard {
    dashboard {
      openTickets
      inProgressTickets
      atRiskTickets
      breachedTickets
    }
  }
`;

export const AGENTS = gql`
  query Agents {
    users(role: AGENT) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const HOLIDAYS = gql`
  query Holidays {
    holidays {
      id
      date
      name
    }
  }
`;

export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        ...UserFields
      }
    }
  }
  ${USER_FIELDS}
`;

export const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        ...UserFields
      }
    }
  }
  ${USER_FIELDS}
`;

export const CREATE_TICKET = gql`
  mutation CreateTicket($input: CreateTicketInput!) {
    createTicket(input: $input) {
      ...TicketFields
    }
  }
  ${TICKET_FIELDS}
`;

export const ASSIGN_TICKET = gql`
  mutation AssignTicket($ticketId: ID!, $assigneeId: ID!) {
    assignTicket(ticketId: $ticketId, assigneeId: $assigneeId) {
      ...TicketFields
    }
  }
  ${TICKET_FIELDS}
`;

export const CHANGE_TICKET_STATUS = gql`
  mutation ChangeTicketStatus($ticketId: ID!, $status: TicketStatus!) {
    changeTicketStatus(ticketId: $ticketId, status: $status) {
      ...TicketFields
    }
  }
  ${TICKET_FIELDS}
`;

export const RESOLVE_TICKET = gql`
  mutation ResolveTicket($ticketId: ID!) {
    resolveTicket(ticketId: $ticketId) {
      ...TicketFields
    }
  }
  ${TICKET_FIELDS}
`;

export const ADD_COMMENT = gql`
  mutation AddComment($ticketId: ID!, $content: String!) {
    addComment(ticketId: $ticketId, content: $content) {
      ...CommentFields
    }
  }
  ${COMMENT_FIELDS}
`;

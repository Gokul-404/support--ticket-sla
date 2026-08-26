import { gql } from "@apollo/client";

export const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    name
    email
    role
    createdAt
  }
`;

export const SLA_FIELDS = gql`
  fragment SLAFields on SLAInfo {
    firstResponseDueAt
    resolutionDueAt
    firstResponseState
    resolutionState
    firstResponseRemainingMinutes
    resolutionRemainingMinutes
  }
`;

export const COMMENT_FIELDS = gql`
  fragment CommentFields on Comment {
    id
    content
    createdAt
    author {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const TICKET_FIELDS = gql`
  fragment TicketFields on Ticket {
    id
    title
    description
    priority
    status
    createdAt
    updatedAt
    firstResponseAt
    resolvedAt
    reporter {
      ...UserFields
    }
    assignee {
      ...UserFields
    }
    sla {
      ...SLAFields
    }
  }
  ${USER_FIELDS}
  ${SLA_FIELDS}
`;

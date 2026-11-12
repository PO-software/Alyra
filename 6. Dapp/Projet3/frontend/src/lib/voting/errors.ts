import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem"

const WRONG_PHASE = "Cette étape n'est pas disponible dans la phase actuelle."

/** The contract's revert strings (Voting.sol is the source of truth) in French. */
const REVERT_MESSAGES: Record<string, string> = {
  "You're not a voter": "Vous n'êtes pas inscrit comme électeur.",
  "Voters registration is not open yet": "L'inscription des électeurs est close.",
  "Already registered": "Cette adresse est déjà inscrite.",
  "Proposals are not allowed yet": "Le dépôt des propositions n'est pas ouvert.",
  "Le nombre de propositions est limite a 1000": "Le nombre maximum de propositions est atteint.",
  "Vous ne pouvez pas ne rien proposer": "La proposition ne peut pas être vide.",
  "Voting session havent started yet": "La session de vote n'est pas ouverte.",
  "You have already voted": "Vous avez déjà voté.",
  "Proposal not found": "Cette proposition n'existe pas.",
  "Registering proposals cant be started now": WRONG_PHASE,
  "Registering proposals havent started yet": WRONG_PHASE,
  "Registering proposals phase is not finished": WRONG_PHASE,
  "Current status is not voting session ended": WRONG_PHASE,
}

const CUSTOM_ERROR_MESSAGES: Record<string, string> = {
  OwnableUnauthorizedAccount: "Action réservée à l'administrateur.",
}

export function isUserRejection(error: unknown): boolean {
  if (error instanceof BaseError) {
    return error.walk((e) => e instanceof UserRejectedRequestError || (e as { code?: unknown }).code === 4001) !== null
  }
  return (error as { code?: unknown } | null)?.code === 4001
}

export function toFrenchError(error: unknown): string {
  if (isUserRejection(error)) return "Transaction annulée dans le wallet."
  if (error instanceof BaseError) {
    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError)
    if (revert instanceof ContractFunctionRevertedError) {
      const customError = revert.data?.errorName
      if (customError && CUSTOM_ERROR_MESSAGES[customError]) return CUSTOM_ERROR_MESSAGES[customError]
      if (revert.reason && REVERT_MESSAGES[revert.reason]) return REVERT_MESSAGES[revert.reason]
    }
  }
  return "La transaction a échoué. Réessayez."
}

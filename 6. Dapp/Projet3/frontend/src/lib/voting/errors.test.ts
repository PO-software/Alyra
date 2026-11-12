import {
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
  encodeErrorResult,
} from "viem"
import { describe, expect, it } from "vitest"

import { votingAbi } from "@/contracts/votingAbi"
import { ACCOUNTS } from "@/test/logs"

import { isUserRejection, toFrenchError } from "./errors"

const reverted = (message: string) =>
  new ContractFunctionExecutionError(
    new ContractFunctionRevertedError({ abi: votingAbi, functionName: "setVote", message }),
    { abi: votingAbi, functionName: "setVote", args: [1n] },
  )

describe("toFrenchError", () => {
  it.each([
    ["You're not a voter", "Vous n'êtes pas inscrit comme électeur."],
    ["Voters registration is not open yet", "L'inscription des électeurs est close."],
    ["Already registered", "Cette adresse est déjà inscrite."],
    ["Proposals are not allowed yet", "Le dépôt des propositions n'est pas ouvert."],
    ["Le nombre de propositions est limite a 1000", "Le nombre maximum de propositions est atteint."],
    ["Vous ne pouvez pas ne rien proposer", "La proposition ne peut pas être vide."],
    ["Voting session havent started yet", "La session de vote n'est pas ouverte."],
    ["You have already voted", "Vous avez déjà voté."],
    ["Proposal not found", "Cette proposition n'existe pas."],
    ["Registering proposals cant be started now", "Cette étape n'est pas disponible dans la phase actuelle."],
    ["Registering proposals havent started yet", "Cette étape n'est pas disponible dans la phase actuelle."],
    ["Registering proposals phase is not finished", "Cette étape n'est pas disponible dans la phase actuelle."],
    ["Current status is not voting session ended", "Cette étape n'est pas disponible dans la phase actuelle."],
  ])("maps the revert reason %j", (reason, french) => {
    expect(toFrenchError(reverted(reason))).toBe(french)
  })

  it("maps OwnableUnauthorizedAccount to the admin-only message", () => {
    const data = encodeErrorResult({ abi: votingAbi, errorName: "OwnableUnauthorizedAccount", args: [ACCOUNTS.voter1] })
    const error = new ContractFunctionExecutionError(
      new ContractFunctionRevertedError({ abi: votingAbi, functionName: "tallyVotes", data }),
      { abi: votingAbi, functionName: "tallyVotes", args: [] },
    )
    expect(toFrenchError(error)).toBe("Action réservée à l'administrateur.")
  })

  it("recognises a rejection in the wallet, even wrapped", () => {
    const wrapped = new ContractFunctionExecutionError(new UserRejectedRequestError(new Error("denied")), {
      abi: votingAbi,
      functionName: "setVote",
      args: [1n],
    })
    expect(isUserRejection(wrapped)).toBe(true)
    expect(toFrenchError(wrapped)).toBe("Transaction annulée dans le wallet.")
  })

  it("falls back to a generic message", () => {
    expect(isUserRejection(new Error("boom"))).toBe(false)
    expect(toFrenchError(new Error("boom"))).toBe("La transaction a échoué. Réessayez.")
    expect(toFrenchError(reverted("Something unexpected"))).toBe("La transaction a échoué. Réessayez.")
  })
})

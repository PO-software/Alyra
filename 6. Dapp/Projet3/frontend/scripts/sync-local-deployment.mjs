// Writes the local (Hardhat node) Voting address into .env.local after `pnpm deploy:local` in backend/.
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const deployedPath = resolve(here, "../../backend/ignition/deployments/chain-31337/deployed_addresses.json")
const envPath = resolve(here, "../.env.local")

if (!existsSync(deployedPath)) {
  console.error(`No local deployment found: ${deployedPath}\nRun \`pnpm deploy:local\` in backend/ first.`)
  process.exit(1)
}

const address = JSON.parse(readFileSync(deployedPath, "utf8"))["VotingModule#Voting"]
if (!address) {
  console.error('"VotingModule#Voting" is missing from deployed_addresses.json.')
  process.exit(1)
}

const values = {
  NEXT_PUBLIC_VOTING_ADDRESS_HARDHAT: address,
  NEXT_PUBLIC_DEPLOYMENT_BLOCK_HARDHAT: "0",
}

const lines = existsSync(envPath) ? readFileSync(envPath, "utf8").split("\n") : []
const kept = lines.filter((line) => !Object.keys(values).some((key) => line.startsWith(`${key}=`)))
while (kept.length > 0 && kept[kept.length - 1] === "") kept.pop()
const updated = [...kept, ...Object.entries(values).map(([key, value]) => `${key}=${value}`)]

writeFileSync(envPath, updated.join("\n") + "\n")
console.log(`Local Voting address ${address} written to ${envPath}`)

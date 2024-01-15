import { BaseChannel } from "../channels/index.js";
import { LastValue } from "../channels/last_value.js";
import { ChannelBatch, ChannelInvoke } from "./read.js";
import { ReservedChannels } from "./reserved.js";

export function validateGraph<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RunInput = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RunOutput = any
>({
  nodes,
  channels,
  input,
  output,
}: {
  nodes: Record<
    string,
    ChannelInvoke<RunInput, RunOutput> | ChannelBatch<RunInput, RunOutput>
  >;
  channels: { [key: string]: BaseChannel<RunOutput> };
  input: string | Array<string>;
  output: string | Array<string>;
}): void {
  const newChannels = channels;
  const subscribedChannels = new Set<string>();
  for (const node of Object.values(nodes)) {
    if (node.lc_graph_name === "ChannelInvoke" && "channels" in node) {
      Object.values(node.channels).map((channel) =>
        subscribedChannels.add(channel)
      );
    } else if (node.lc_graph_name === "ChannelBatch" && "channel" in node) {
      subscribedChannels.add(node.channel);
    } else {
      console.error(node);
      throw new Error(
        `Invalid node type: ${JSON.stringify(
          node,
          null,
          2
        )}, expected Channel.subscribeTo() or Channel.subscribe_to_each()`
      );
    }
  }

  for (const chan of [...subscribedChannels]) {
    if (!(chan in newChannels)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newChannels[chan] = new LastValue<any>();
    }
  }

  if (typeof input === "string") {
    if (!(input in newChannels)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newChannels[input] = new LastValue<any>();
    }
    if (!subscribedChannels.has(input)) {
      throw new Error(
        `Input channel ${input} is not subscribed to by any node.`
      );
    }
  } else {
    for (const chan of input) {
      if (!(chan in newChannels)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newChannels[chan] = new LastValue<any>();
      }
    }
    if (input.every((chan) => !subscribedChannels.has(chan))) {
      throw new Error(
        `None of the input channels ${input} are subscribed to by any node`
      );
    }
  }

  if (typeof output === "string") {
    if (!(output in newChannels)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newChannels[output] = new LastValue<any>();
    }
  } else {
    for (const chan of output) {
      if (!(chan in newChannels)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newChannels[chan] = new LastValue<any>();
      }
    }
  }

  for (const chan in ReservedChannels) {
    if (!(chan in newChannels)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newChannels[chan] = new LastValue<any>();
    }
  }
}

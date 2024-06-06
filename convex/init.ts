import { internalMutation } from "./_generated/server";

export default internalMutation({
  handler: async () => {
    console.log("can register statically-defined crons here");
  },
});

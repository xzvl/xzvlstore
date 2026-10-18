import { makeListHandlers } from "@/lib/account-list";

const handlers = makeListHandlers("favorites", { publicCount: true });

export const GET = handlers.GET;
export const POST = handlers.POST;
export const DELETE = handlers.DELETE;

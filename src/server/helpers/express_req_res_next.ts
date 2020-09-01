import { NextFunction, Request, Response } from "express";

export type ExpressMiddleware = (req: Request, res: Response, next: NextFunction) => Response<unknown> | Promise<void> | void | NextFunction
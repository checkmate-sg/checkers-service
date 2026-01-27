/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

import { APIError, Leaderboard } from "./data-contracts";
import { HttpClient, RequestParams } from "./http-client";

export class Leaderboard<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Retrieves leaderboard data for the current month.
   *
   * @tags Leaderboard
   * @name LeaderboardList
   * @summary Get leaderboard information
   * @request GET:/leaderboard
   */
  leaderboardList = (params: RequestParams = {}) =>
    this.request<
      {
        /** @example true */
        success?: boolean;
        data?: Leaderboard[];
      },
      APIError
    >({
      path: `/leaderboard`,
      method: "GET",
      format: "json",
      ...params,
    });
}

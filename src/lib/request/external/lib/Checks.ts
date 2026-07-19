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

import { APIError, Poll } from "./data-contracts";
import { HttpClient, RequestParams } from "./http-client";

export class Checks<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Return poll details based on the checkId (external ID from CheckMate platform)
   *
   * @tags Polls
   * @name PollDetail
   * @summary Retrieve poll by external check ID
   * @request GET:/checks/{checkId}/poll
   */
  pollDetail = (checkId: string, params: RequestParams = {}) =>
    this.request<Poll, APIError>({
      path: `/checks/${checkId}/poll`,
      method: "GET",
      format: "json",
      ...params,
    });
}

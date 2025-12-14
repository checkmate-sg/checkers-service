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

import { APIError, APIPagination, Checker, VotesMessageBrief } from "./data-contracts";
import { HttpClient, RequestParams } from "./http-client";

export class Checkers<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Return all the fields of a checkers based on the checkerId to check if the checkers exist in the database
   *
   * @tags Checkers
   * @name CheckersDetail
   * @summary Retrieves checkers information based on checkerId
   * @request GET:/checkers/{checkerId}
   */
  checkersDetail = (checkerId: string, params: RequestParams = {}) =>
    this.request<Checker, APIError>({
      path: `/checkers/${checkerId}`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * @description Return a paginated list of Votes based on the checkerId
   *
   * @tags Checkers
   * @name VotesDetail
   * @summary Retrieves ALL the Votes details based on checkerId
   * @request GET:/checkers/{checkerId}/votes
   */
  votesDetail = (
    checkerId: string,
    query: {
      /** sort by value, createTimestamp */
      sorting?: string;
      /**
       * Number of items per page
       * @format int32
       * @min 0
       * @default 50
       */
      limit?: number;
      /**
       * Number of items skipped
       * @format int32
       * @min 0
       * @default 0
       */
      offset?: number;
      /** Check if checker have voted */
      VoteCheckerStatus: boolean;
    },
    params: RequestParams = {}
  ) =>
    this.request<
      APIPagination & {
        /**
         * List of VoteMessageBrief based on checkerid
         * @default []
         */
        items?: VotesMessageBrief[];
      },
      APIError
    >({
      path: `/checkers/${checkerId}/votes`,
      method: "GET",
      query: query,
      format: "json",
      ...params,
    });
}

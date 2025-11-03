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

import { APIError, Vote, VotePOST } from './data-contracts';
import { ContentType, HttpClient, RequestParams } from './http-client';

export class Votes<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Return the specific Vote detail based on the voteId
   *
   * @tags Votes
   * @name VotesDetail
   * @summary Retrieve the specific Vote detail
   * @request GET:/votes/{voteId}
   */
  votesDetail = (voteId: string, params: RequestParams = {}) =>
    this.request<Vote, APIError>({
      path: `/votes/${voteId}`,
      method: 'GET',
      format: 'json',
      ...params,
    });
  /**
   * @description Update the category, truthScore (if any) and responseCategory of the Vote
   *
   * @tags Votes
   * @name VotesCreate
   * @summary Update the Vote Detail
   * @request POST:/votes/{voteId}
   */
  votesCreate = (voteId: string, data: VotePOST, params: RequestParams = {}) =>
    this.request<
      {
        /** @example "Vote successfully updated" */
        message?: string;
        /** The database identifier of the updated vote */
        id?: string;
      },
      APIError
    >({
      path: `/votes/${voteId}`,
      method: 'POST',
      body: data,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
}

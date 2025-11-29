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

import { APIError, Poll, PollRequest } from './data-contracts';
import { ContentType, HttpClient, RequestParams } from './http-client';

export class Polls<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Create a poll in the database and disseminate the vote message to ALL active checkers
   *
   * @tags Polls
   * @name WebhookCreate
   * @summary Create a new poll using the webhook
   * @request POST:/polls/webhook
   */
  webhookCreate = (data: PollRequest, params: RequestParams = {}) =>
    this.request<
      {
        /** @example "Poll created successfully" */
        message?: string;
        /** The database identifier of the created poll */
        id?: string;
      },
      APIError
    >({
      path: `/polls/webhook`,
      method: 'POST',
      body: data,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * @description Return all the of a poll based on the externalId to get all the details of the poll
   *
   * @tags Polls
   * @name PollsDetail
   * @summary Retrieve the specific Poll detail
   * @request GET:/polls/{externalId}
   */
  pollsDetail = (externalId: string, params: RequestParams = {}) =>
    this.request<Poll, APIError>({
      path: `/polls/${externalId}`,
      method: 'GET',
      format: 'json',
      ...params,
    });
  /**
   * @description Retrieves category counts and truth score statistics for a specific poll
   *
   * @tags Polls
   * @name ResultsDetail
   * @summary Get poll statistics by poll ID
   * @request GET:/polls/{externalId}/results
   */
  resultsDetail = (externalId: string, params: RequestParams = {}) =>
    this.request<
      {
        /**
         * Number of votes categorized as scam
         * @example 0
         */
        scam?: number;
        /**
         * Number of votes categorized as illicit
         * @example 0
         */
        illicit?: number;
        /** Information category with truth score breakdown */
        info?: {
          /**
           * Number of votes with truth score 0
           * @example 0
           */
          '0'?: number;
          /**
           * Number of votes with truth score 1
           * @example 0
           */
          '1'?: number;
          /**
           * Number of votes with truth score 2
           * @example 0
           */
          '2'?: number;
          /**
           * Number of votes with truth score 3
           * @example 0
           */
          '3'?: number;
          /**
           * Number of votes with truth score 4
           * @example 1
           */
          '4'?: number;
          /**
           * Number of votes with truth score 5
           * @example 0
           */
          '5'?: number;
          /**
           * Total number of info votes
           * @example 1
           */
          total?: number;
        };
        /**
         * Number of votes categorized as satire
         * @example 0
         */
        satire?: number;
        /**
         * Number of votes categorized as spam
         * @example 0
         */
        spam?: number;
        /**
         * Number of votes categorized as legitimate
         * @example 0
         */
        legitimate?: number;
        /**
         * Number of votes categorized as irrelevant
         * @example 0
         */
        irrelevant?: number;
        /**
         * Number of votes categorized as unsure
         * @example 0
         */
        unsure?: number;
        /**
         * Number of votes that passed
         * @example 0
         */
        pass?: number;
        /**
         * Number of votes that voted great
         * @example 0
         */
        great?: number;
        /**
         * Number of votes that voted acceptable
         * @example 0
         */
        acceptable?: number;
        /**
         * Number of votes that voted unacceptable
         * @example 0
         */
        unacceptable?: number;
      },
      APIError
    >({
      path: `/polls/${externalId}/results`,
      method: 'GET',
      format: 'json',
      ...params,
    });
}

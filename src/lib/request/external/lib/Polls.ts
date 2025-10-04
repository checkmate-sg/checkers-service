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

import { APIError, PollRequest } from './data-contracts';
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
}

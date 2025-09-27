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

import { APIError, Checker } from './data-contracts';
import { HttpClient, RequestParams } from './http-client';

export class Checkers<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Return all the fields of a checkers based on che checkerId to check if the checkers exist in the database
   *
   * @tags Checkers
   * @name CheckersDetail
   * @summary Retrieves checkers information based on checkerId
   * @request GET:/checkers/{checkerId}
   */
  checkersDetail = (checkerId: string, params: RequestParams = {}) =>
    this.request<Checker, APIError>({
      path: `/checkers/${checkerId}`,
      method: 'GET',
      format: 'json',
      ...params,
    });
}

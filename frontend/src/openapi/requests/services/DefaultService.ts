/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Answer } from '../models/Answer';
import type { Question } from '../models/Question';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class DefaultService {

    /**
     * Ask
     * @param requestBody
     * @returns Answer Successful Response
     * @throws ApiError
     */
    public static askAskPost(
        requestBody: Question,
    ): CancelablePromise<Answer> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/ask',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
                500: `Internal Server Error`,
            },
        });
    }

}
